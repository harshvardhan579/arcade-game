import { describe, expect, it } from 'vitest';
import {
  BounceCircuitLogic,
  runnerCoyoteSteps,
  runnerGraceUnits,
  runnerJumpVelocity,
  runnerMaxSpeed
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

  it('buffers a jump pressed just before landing', () => {
    const logic = new BounceCircuitLogic(9);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().velocityY < -2);
    logic.handleInput('UP');
    stepUntil(logic, () => logic.getState().playerY === 0, 60);
    logic.step();
    const state = logic.getState();
    expect(state.grounded).toBe(false);
    expect(state.playerY).toBeGreaterThan(0);
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
