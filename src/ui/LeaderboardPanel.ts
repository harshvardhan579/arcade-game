// Game-over leaderboard submission panel (plan §4 / Phase 4). A compact DOM
// overlay inside `.game-root` — never drawn into the Phaser canvas — that
// appears only when the feature flag is on, the run ended, and the score is
// positive. It offers name entry (or a saved name + Edit), validates with the
// shared client validator for friendly messages, and submits exactly once per
// run-end on an explicit tap (Retry re-arms after a failure). It never
// auto-submits, never logs, and renders every server value via `textContent`.
//
// The feature flag decides whether this even mounts: with the flag off the
// panel DOM never exists, so a flag-off build carries zero leaderboard markup
// and makes zero `/api` requests. Dismissal rides the shell's own signals —
// `arcade-run-start` (Restart, ACTION-after-death, scene (re)start) and
// `arcade-go-home` (Back) — so restart and navigation always clear the panel.

import { leaderboardService, type LeaderboardFailure } from '../core/LeaderboardService';
import { SafeStorage } from '../core/Storage';
import type { GameOverDetail } from '../core/types';
import { hasCoarsePointer } from '../core/Viewport';
import { validateName, type NameErrorCode } from '../leaderboard/names';
import { isGameId } from '../leaderboard/types';
import type { GameId, LeaderboardEntry, SubmitRequest, SubmitResponse } from '../leaderboard/types';

// Persisted display name; reused across runs and games (plan §4).
const PLAYER_NAME_KEY = 'pocket-arcade:player-name';

const HELPER_TEXT = '2–16 letters, numbers, spaces, - or _';
const VALIDATION_MESSAGES: Readonly<Record<NameErrorCode, string>> = {
  name_length: 'Use 2–16 characters',
  name_charset: 'Letters, numbers, spaces, - and _ only',
  name_not_allowed: "That name isn't allowed"
};

// Top-list copy (Phase 0 decisions). Fewer rows on coarse-pointer/short
// canvases so the panel never needs to scroll or overrun the cabinet screen.
const TOP_LIMIT_DESKTOP = 10;
const TOP_LIMIT_COARSE = 5;
const LIST_LOADING = '…';
const LIST_EMPTY = 'No scores yet — be the first';
const LIST_UNAVAILABLE = 'Global scores unavailable';

type MessageTone = 'muted' | 'error' | 'success';

interface ActiveRun {
  gameId: GameId;
  score: number;
  tick: number;
  runSeed: number;
}

function readGameOverDetail(event: Event): ActiveRun | null {
  const detail = (event as CustomEvent<GameOverDetail>).detail;
  if (
    !detail ||
    !isGameId(detail.gameId) ||
    typeof detail.score !== 'number' ||
    typeof detail.tick !== 'number' ||
    typeof detail.runSeed !== 'number'
  ) {
    return null;
  }
  return {
    gameId: detail.gameId,
    score: detail.score,
    tick: detail.tick,
    runSeed: detail.runSeed
  };
}

// Map a typed service failure to friendly copy and whether Retry is offered.
// A definitive 4xx rejection is not retryable (resending the same payload
// fails identically); everything transient (offline, 429, 5xx, malformed) is.
function describeFailure(failure: LeaderboardFailure): { message: string; retry: boolean } {
  if (failure.reason === 'offline') {
    return { message: "Couldn't reach the leaderboard", retry: true };
  }
  if (failure.reason === 'http') {
    if (failure.status === 429) {
      return { message: 'Too many submissions — try again in a minute', retry: true };
    }
    if (failure.status !== undefined && failure.status >= 500) {
      return { message: 'Leaderboard is unavailable right now', retry: true };
    }
    if (
      failure.code === 'name_not_allowed' ||
      failure.code === 'name_length' ||
      failure.code === 'name_charset'
    ) {
      return { message: "That name isn't allowed", retry: false };
    }
    return { message: "That score couldn't be submitted", retry: false };
  }
  // 'invalid' (unexpected 200 body) is transient/unknown; 'disabled' cannot
  // reach here because the panel only submits while enabled.
  return { message: 'Leaderboard is unavailable right now', retry: true };
}

/**
 * Mounts the submission panel into `gameRoot`. No-ops (and creates no DOM)
 * unless the leaderboard feature is enabled, keeping flag-off builds free of
 * any leaderboard markup or network. Idempotent per document — it wires
 * window listeners once.
 */
export function mountLeaderboardPanel(gameRoot: HTMLElement): void {
  if (!leaderboardService.isEnabled()) return;

  const storage = new SafeStorage();

  const panel = document.createElement('section');
  panel.className = 'leaderboard-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Global leaderboard');

  const heading = document.createElement('p');
  heading.className = 'lb-heading';
  heading.textContent = 'GLOBAL LEADERBOARD';

  const form = document.createElement('form');
  form.className = 'lb-form';
  // No action/method: this posts through the service, never a native submit.
  form.setAttribute('novalidate', '');

  const nameRow = document.createElement('div');
  nameRow.className = 'lb-name-row';

  const nameInput = document.createElement('input');
  nameInput.className = 'lb-name';
  nameInput.type = 'text';
  nameInput.maxLength = 16;
  nameInput.autocomplete = 'off';
  nameInput.setAttribute('autocapitalize', 'off');
  nameInput.setAttribute('autocorrect', 'off');
  nameInput.setAttribute('spellcheck', 'false');
  nameInput.setAttribute('enterkeyhint', 'send');
  nameInput.placeholder = 'YOUR NAME';
  nameInput.setAttribute('aria-label', 'Your name');

  const saved = document.createElement('div');
  saved.className = 'lb-saved';
  saved.hidden = true;
  const savedLabel = document.createElement('span');
  savedLabel.className = 'lb-saved-label';
  savedLabel.textContent = 'Playing as';
  const savedName = document.createElement('span');
  savedName.className = 'lb-saved-name';
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'lb-edit';
  editButton.textContent = 'Edit';
  saved.append(savedLabel, savedName, editButton);

  nameRow.append(nameInput, saved);

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'lb-submit';
  submitButton.textContent = 'Submit score';

  form.append(nameRow, submitButton);

  const message = document.createElement('p');
  message.className = 'lb-message';
  message.setAttribute('aria-live', 'polite');

  const retryButton = document.createElement('button');
  retryButton.type = 'button';
  retryButton.className = 'lb-retry';
  retryButton.textContent = 'Retry';
  retryButton.hidden = true;

  // Top-score list: heading + either rows or a single status line.
  const list = document.createElement('div');
  list.className = 'lb-list';
  const listHeading = document.createElement('p');
  listHeading.className = 'lb-list-heading';
  const listRows = document.createElement('ol');
  listRows.className = 'lb-list-rows';
  listRows.hidden = true;
  const listStatus = document.createElement('p');
  listStatus.className = 'lb-list-status';
  list.append(listHeading, listRows, listStatus);

  panel.append(heading, form, message, retryButton, list);
  gameRoot.append(panel);

  // --- Panel state -------------------------------------------------------
  let activeRun: ActiveRun | null = null;
  // Editing = the text input is shown (first run, or after Edit). Otherwise a
  // saved valid name is shown with an Edit affordance.
  let editing = true;
  // A request is in flight; blocks concurrent submits (Enter + Retry races).
  let inFlight = false;
  // The name of the most recent attempt, so Retry can resend without re-reading
  // the form (which is hidden after the first attempt).
  let lastAttemptName: string | null = null;

  function setMessage(text: string, tone: MessageTone): void {
    message.textContent = text;
    message.dataset.tone = tone;
  }

  function showForm(show: boolean): void {
    form.hidden = !show;
  }

  function applyEntryMode(prefill: string): void {
    editing = true;
    saved.hidden = true;
    nameInput.hidden = false;
    nameInput.value = prefill;
    validateInput();
  }

  function applySavedMode(name: string): void {
    editing = false;
    nameInput.hidden = true;
    saved.hidden = false;
    savedName.textContent = name; // textContent: names are user/stored data.
    submitButton.disabled = false;
    setMessage('', 'muted');
  }

  // Live validation drives Submit's enabled state and the helper/error copy.
  function validateInput(): void {
    const result = validateName(nameInput.value);
    if (result.ok) {
      submitButton.disabled = false;
      setMessage(HELPER_TEXT, 'muted');
    } else {
      submitButton.disabled = true;
      setMessage(VALIDATION_MESSAGES[result.code], 'error');
    }
  }

  function currentNameRaw(): string {
    return editing ? nameInput.value : (savedName.textContent ?? '');
  }

  function setListStatus(text: string): void {
    listRows.replaceChildren();
    listRows.hidden = true;
    listStatus.hidden = false;
    listStatus.textContent = text;
  }

  function renderRows(entries: LeaderboardEntry[]): void {
    listStatus.hidden = true;
    listRows.hidden = false;
    listRows.replaceChildren();
    for (const entry of entries) {
      const row = document.createElement('li');
      row.className = 'lb-row';
      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      rank.textContent = `#${entry.rank}`;
      const name = document.createElement('span');
      name.className = 'lb-row-name';
      name.textContent = entry.name; // textContent: server data, never innerHTML.
      const score = document.createElement('span');
      score.className = 'lb-row-score';
      score.textContent = String(entry.score);
      row.append(rank, name, score);
      listRows.append(row);
    }
  }

  // Independent of the submit flow: fetching/rendering the list never blocks
  // Submit, Retry, Restart, Back, or ACTION restart.
  async function loadTopList(run: ActiveRun): Promise<void> {
    const limit = hasCoarsePointer() ? TOP_LIMIT_COARSE : TOP_LIMIT_DESKTOP;
    listHeading.textContent = `TOP ${limit}`;
    setListStatus(LIST_LOADING);
    const result = await leaderboardService.fetchTop(run.gameId, limit);
    if (activeRun !== run) return; // Dismissed/replaced while awaiting.
    if (!result.ok) {
      setListStatus(LIST_UNAVAILABLE);
      return;
    }
    const entries = result.data.entries.slice(0, limit);
    if (entries.length === 0) {
      setListStatus(LIST_EMPTY);
      return;
    }
    renderRows(entries);
  }

  function open(run: ActiveRun): void {
    activeRun = run;
    inFlight = false;
    lastAttemptName = null;
    retryButton.hidden = true;
    showForm(true);

    const stored = storage.getString(PLAYER_NAME_KEY, '');
    const storedValidation = validateName(stored);
    if (storedValidation.ok) {
      applySavedMode(storedValidation.name);
    } else {
      applyEntryMode('');
    }
    panel.classList.add('is-open');
    void loadTopList(run);
  }

  function close(): void {
    activeRun = null;
    inFlight = false;
    panel.classList.remove('is-open');
  }

  function showSuccess(name: string, response: SubmitResponse): void {
    showForm(false);
    retryButton.hidden = true;
    if (response.improved) {
      setMessage(`Ranked #${response.rank} worldwide · Best ${response.best}`, 'success');
    } else {
      setMessage(`Best for ${name} is ${response.best}`, 'muted');
    }
  }

  function showFailure(failure: LeaderboardFailure): void {
    showForm(false);
    const { message: text, retry } = describeFailure(failure);
    setMessage(text, 'error');
    retryButton.hidden = !retry;
  }

  async function performSubmit(name: string, run: ActiveRun): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    lastAttemptName = name;
    nameInput.blur(); // Trap 7: release focus so gameplay keys flow again.
    showForm(false);
    retryButton.hidden = true;
    setMessage('Submitting…', 'muted');

    const payload: SubmitRequest = {
      gameId: run.gameId,
      name,
      score: run.score,
      tick: run.tick,
      runSeed: run.runSeed
    };
    const result = await leaderboardService.submit(payload);

    inFlight = false;
    // The run may have been dismissed/replaced while awaiting; if so, drop it.
    if (activeRun !== run) return;

    if (result.ok) {
      // Persist the name only on a confirmed accept (plan §4).
      storage.setString(PLAYER_NAME_KEY, name);
      showSuccess(name, result.data);
      // An improved score changed the standings — refresh so the player sees
      // their new rank. A non-improving accept leaves the list as-is.
      if (result.data.improved) void loadTopList(run);
    } else {
      showFailure(result);
    }
  }

  nameInput.addEventListener('input', validateInput);

  editButton.addEventListener('click', () => {
    const stored = storage.getString(PLAYER_NAME_KEY, '');
    applyEntryMode(stored);
    nameInput.focus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!activeRun || inFlight) return;
    const result = validateName(currentNameRaw());
    if (!result.ok) {
      setMessage(VALIDATION_MESSAGES[result.code], 'error');
      return;
    }
    void performSubmit(result.name, activeRun);
  });

  retryButton.addEventListener('click', () => {
    if (!activeRun || inFlight || lastAttemptName === null) return;
    void performSubmit(lastAttemptName, activeRun);
  });

  window.addEventListener('arcade-game-over', (event) => {
    // Gate: enabled build + real run end + a rankable (positive) score.
    if (!leaderboardService.isEnabled()) return;
    const run = readGameOverDetail(event);
    if (!run || run.score <= 0) return;
    open(run);
  });

  // A new run starting or navigating home clears the panel entirely.
  window.addEventListener('arcade-run-start', close);
  window.addEventListener('arcade-go-home', close);
}
