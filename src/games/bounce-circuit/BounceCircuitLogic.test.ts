import { describe, expect, it } from 'vitest';
import {
  BounceCircuitLogic,
  runnerCoyoteSteps,
  runnerDoubleJumpVelocity,
  runnerGraceUnits,
  runnerHardChunkAt,
  runnerJumpVelocity,
  runnerMaxSpeed,
  runnerOrbWindowY
} from './BounceCircuitLogic';

function stepUntil(logic: BounceCircuitLogic, predicate: () => boolean, guard = 600): number {
  let steps = 0;
  while (!predicate() && steps < guard) {
    logic.step();
    steps += 1;
  }
  return steps;
}

describe('BounceCircuitLogic', () => {
  it('auto-runs forward with the camera tracking distance, deterministically', () => {
    const run = () => {
      const logic = new BounceCircuitLogic(9);
      for (let i = 0; i < 150; i += 1) logic.step();
      return logic.getState();
    };
    const first = run();
    expect(first.distance).toBeGreaterThan(5);
    expect(first.cameraX).toBeGreaterThan(5);
    expect(first.playerX).toBeCloseTo(first.cameraX + 3, 5);
    expect(run()).toEqual(first);
  });

  it('restart regenerates the identical course for the same seed', () => {
    const logic = new BounceCircuitLogic(12);
    for (let i = 0; i < 200; i += 1) logic.step();
    const firstRun = logic.getState();
    logic.restart(12);
    expect(logic.getState().distance).toBe(0);
    for (let i = 0; i < 200; i += 1) logic.step();
    expect(logic.getState()).toEqual(firstRun);
  });

  it('jump rises off the ground and lands back down', () => {
    const logic = new BounceCircuitLogic(9);
    expect(logic.getState().grounded).toBe(true);
    logic.handleInput('UP');
    expect(logic.getState().velocityY).toBe(runnerJumpVelocity);
    logic.step();
    expect(logic.getState().playerY).toBeGreaterThan(0);
    expect(logic.getState().grounded).toBe(false);
    const airborne = stepUntil(logic, () => logic.getState().grounded);
    expect(airborne).toBeGreaterThan(8);
    expect(airborne).toBeLessThan(40);
    expect(logic.getState().playerY).toBe(0);
  });

  it('lands on a platform from above and passes beneath it when grounded', () => {
    const landing = new BounceCircuitLogic(9);
    landing.platforms.push({ x: 6, width: 6, height: 2 });
    stepUntil(landing, () => landing.getState().playerX >= 5.4);
    landing.handleInput('UP');
    stepUntil(landing, () => landing.getState().grounded);
    expect(landing.getState().playerY).toBe(2);
    expect(landing.getState().isGameOver).toBe(false);

    const underpass = new BounceCircuitLogic(9);
    underpass.platforms.push({ x: 6, width: 6, height: 2 });
    stepUntil(underpass, () => underpass.getState().playerX >= 13);
    expect(underpass.getState().playerY).toBe(0);
    expect(underpass.getState().grounded).toBe(true);
    expect(underpass.getState().isGameOver).toBe(false);
  });

  it('grants a coyote jump just after running off a platform edge', () => {
    const logic = new BounceCircuitLogic(9);
    logic.platforms.push({ x: 6, width: 6, height: 2 });
    stepUntil(logic, () => logic.getState().playerX >= 5.4);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().grounded);
    expect(logic.getState().playerY).toBe(2);
    stepUntil(logic, () => !logic.getState().grounded, 200);
    expect(logic.getState().grounded).toBe(false);
    logic.handleInput('UP');
    expect(logic.getState().velocityY).toBe(runnerJumpVelocity);
    logic.step();
    expect(logic.getState().playerY).toBeGreaterThan(2);
  });

  it('expires the coyote grace a few steps after leaving support', () => {
    const logic = new BounceCircuitLogic(9);
    logic.platforms.push({ x: 6, width: 6, height: 2 });
    stepUntil(logic, () => logic.getState().playerX >= 5.4);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().grounded);
    stepUntil(logic, () => !logic.getState().grounded, 200);
    for (let i = 0; i < runnerCoyoteSteps - 1; i += 1) logic.step();
    expect(logic.getState().grounded, 'player must still be falling for this check').toBe(false);
    logic.handleInput('UP');
    expect(logic.getState().velocityY).not.toBe(runnerJumpVelocity);
    expect(logic.getState().grounded).toBe(false);
  });

  it('grants one smaller mid-air jump, reset by landing', () => {
    const logic = new BounceCircuitLogic(9);
    logic.handleInput('UP');
    expect(logic.getState().velocityY).toBe(runnerJumpVelocity);
    for (let i = 0; i < 4; i += 1) logic.step();
    logic.handleInput('UP');
    const doubled = logic.getState();
    expect(doubled.velocityY, 'second press must use the smaller impulse').toBe(
      runnerDoubleJumpVelocity
    );
    expect(doubled.airJumpUsed).toBe(true);
    logic.step();
    expect(logic.getState().playerY).toBeGreaterThan(doubled.playerY);
    stepUntil(logic, () => logic.getState().grounded);
    expect(logic.getState().airJumpUsed, 'landing must rearm the mid-air jump').toBe(false);
    logic.handleInput('UP');
    expect(logic.getState().velocityY).toBe(runnerJumpVelocity);
  });

  it('buffers a jump pressed just before landing once the mid-air jump is spent', () => {
    const logic = new BounceCircuitLogic(9);
    logic.handleInput('UP');
    logic.step();
    logic.handleInput('UP');
    expect(logic.getState().airJumpUsed).toBe(true);
    stepUntil(logic, () => logic.getState().velocityY < -2);
    const falling = logic.getState().velocityY;
    logic.handleInput('UP');
    expect(logic.getState().velocityY, 'third press must only buffer, not add impulse').toBe(
      falling
    );
    stepUntil(logic, () => logic.getState().playerY === 0, 90);
    logic.step();
    const state = logic.getState();
    expect(state.grounded, 'the buffered jump must fire on landing').toBe(false);
    expect(state.playerY).toBeGreaterThan(0);
  });

  it('a coyote jump is a full jump and keeps the mid-air jump in hand', () => {
    const logic = new BounceCircuitLogic(9);
    logic.platforms.push({ x: 6, width: 6, height: 2 });
    stepUntil(logic, () => logic.getState().playerX >= 5.4);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().grounded);
    expect(logic.getState().playerY).toBe(2);
    stepUntil(logic, () => !logic.getState().grounded, 200);
    logic.handleInput('UP');
    expect(logic.getState().velocityY, 'coyote press must give the full impulse').toBe(
      runnerJumpVelocity
    );
    expect(logic.getState().airJumpUsed).toBe(false);
    logic.step();
    logic.handleInput('UP');
    expect(logic.getState().velocityY, 'the mid-air jump must still be available').toBe(
      runnerDoubleJumpVelocity
    );
  });

  it('a single jump peaks below the tallest platform; adding the mid-air jump lands on it', () => {
    const solo = new BounceCircuitLogic(9);
    solo.handleInput('UP');
    let peak = 0;
    while (!solo.getState().grounded) {
      solo.step();
      peak = Math.max(peak, solo.getState().playerY);
    }
    expect(peak, 'the nerfed jump must stay under 2.5').toBeLessThan(2.5);
    expect(peak, 'but still reach the 2.1 platform band').toBeGreaterThanOrEqual(2.2);

    const climber = new BounceCircuitLogic(9);
    climber.platforms.push({ x: 6, width: 5, height: 2.5 });
    stepUntil(climber, () => climber.getState().playerX >= 4.2);
    climber.handleInput('UP');
    stepUntil(climber, () => !climber.getState().grounded && climber.getState().velocityY <= 0.25);
    climber.handleInput('UP');
    stepUntil(climber, () => climber.getState().grounded);
    expect(climber.getState().playerY, 'first + mid-air jump must land on 2.5').toBe(2.5);
    expect(climber.getState().isGameOver).toBe(false);
  });

  it('a spike ends the run and banks the distance into the score', () => {
    const logic = new BounceCircuitLogic(9);
    logic.spikes.push({ x: 8 });
    stepUntil(logic, () => logic.getState().isGameOver);
    const state = logic.getState();
    expect(state.isGameOver).toBe(true);
    expect(state.phase).toBe('game-over');
    expect(Math.abs(state.playerX - 8)).toBeLessThan(0.5);
    expect(state.score).toBe(state.distance);
    logic.handleInput('ACTION');
    const restarted = logic.getState();
    expect(restarted.isGameOver).toBe(false);
    expect(restarted.distance).toBe(0);
    expect(restarted.score).toBe(0);
  });

  it('jumping clears a spike', () => {
    const logic = new BounceCircuitLogic(9);
    logic.spikes.push({ x: 8 });
    stepUntil(logic, () => logic.getState().playerX >= 6.9);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().playerX >= 9.5);
    expect(logic.getState().isGameOver).toBe(false);
  });

  it('collects orbs for score without stopping the run', () => {
    const logic = new BounceCircuitLogic(9);
    logic.orbs.push({ x: 7, y: 0.6 });
    stepUntil(logic, () => logic.getState().orbsCollected > 0);
    const state = logic.getState();
    expect(state.orbsCollected).toBe(1);
    expect(state.score).toBe(25);
    expect(state.orbs).not.toContainEqual({ x: 7, y: 0.6 });
    expect(state.isGameOver).toBe(false);
  });

  it('the widened pickup collects a platform-height orb while grounded but not one above it', () => {
    const logic = new BounceCircuitLogic(9);
    // 0.8 is the platform-top orb offset — running across a platform (or the
    // ground) must now collect it; just past the pickup reach must not.
    logic.orbs.push({ x: 6, y: 0.8 }, { x: 10, y: runnerOrbWindowY + 0.1 });
    stepUntil(logic, () => logic.getState().playerX >= 12);
    const state = logic.getState();
    expect(state.orbsCollected, 'the 0.8-high orb must collect on the run-through').toBe(1);
    expect(state.orbs.some((orb) => orb.x === 10)).toBe(true);
  });

  it('hard chunks (fence, bounty) appear only past the distance gate', () => {
    const logic = new BounceCircuitLogic(11);
    let fenceAt = 0;
    let bountyAt = 0;
    for (let i = 0; i < 2000 && !(fenceAt && bountyAt); i += 1) {
      const state = logic.step();
      const spikes = [...logic.spikes].sort((a, b) => a.x - b.x);
      for (let s = 0; s + 2 < spikes.length; s += 1) {
        const gapA = spikes[s + 1]!.x - spikes[s]!.x;
        const gapB = spikes[s + 2]!.x - spikes[s + 1]!.x;
        if (Math.abs(gapA - 1.1) < 0.001 && Math.abs(gapB - 1.1) < 0.001) {
          fenceAt = fenceAt || spikes[s]!.x;
        }
      }
      for (const orb of logic.orbs) {
        if (orb.y === 1.3 && spikes.some((spike) => spike.x === orb.x)) {
          bountyAt = bountyAt || orb.x;
        }
      }
      // Keep the unguided runner alive so generation can be observed: drop
      // only spikes inside the kill band (patterns are scanned first).
      logic.spikes = logic.spikes.filter((spike) => Math.abs(spike.x - state.playerX) > 1.2);
    }
    expect(fenceAt, 'a spike fence must appear within the probe run').toBeGreaterThan(0);
    expect(bountyAt, 'an orb bounty must appear within the probe run').toBeGreaterThan(0);
    expect(fenceAt, 'no fence before the gate').toBeGreaterThanOrEqual(runnerHardChunkAt);
    expect(bountyAt, 'no bounty before the gate').toBeGreaterThanOrEqual(runnerHardChunkAt);
  });

  it('different seeds lay out different courses', () => {
    // A single chunk can coincide across seeds (adjacent LCG seeds correlate),
    // so compare several chunks' worth of generated course.
    const layout = (seed: number) => {
      const logic = new BounceCircuitLogic(seed);
      const entities = new Set<string>();
      for (let i = 0; i < 400; i += 1) {
        const state = logic.step();
        for (const spike of logic.spikes) entities.add(`spike:${spike.x}`);
        for (const orb of logic.orbs) entities.add(`orb:${orb.x}:${orb.y}`);
        for (const platform of logic.platforms) {
          entities.add(`platform:${platform.x}:${platform.height}`);
        }
        // Survive spikes so generation keeps going (scan happened above).
        logic.spikes = logic.spikes.filter((spike) => Math.abs(spike.x - state.playerX) > 1.2);
      }
      return [...entities].sort();
    };
    expect(layout(21)).not.toEqual(layout(22));
  });

  it('generates spikes at a bounded cadence so unguided runs always end', () => {
    const logic = new BounceCircuitLogic(11);
    const steps = stepUntil(logic, () => logic.getState().isGameOver, 5000);
    expect(logic.getState().isGameOver).toBe(true);
    expect(steps).toBeLessThan(5000);
    expect(logic.getState().distance).toBeGreaterThanOrEqual(runnerGraceUnits - 4);
  });

  it('ramps speed monotonically up to the cap', () => {
    const logic = new BounceCircuitLogic(9);
    let previous = logic.getState().speed;
    for (let i = 0; i < 3000; i += 1) {
      logic.spikes.length = 0;
      logic.platforms.length = 0;
      logic.step();
      const speed = logic.getState().speed;
      expect(speed).toBeGreaterThanOrEqual(previous);
      previous = speed;
    }
    expect(previous).toBe(runnerMaxSpeed);
  });

  it('returns a JSON-serializable, detached snapshot', () => {
    const logic = new BounceCircuitLogic(9);
    for (let i = 0; i < 220; i += 1) logic.step();
    const state = logic.getState();
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    (state.spikes as { x: number }[]).push({ x: 999 });
    expect(logic.getState().spikes).not.toContainEqual({ x: 999 });
  });
});
