import {
  ActivityApplyResult,
  ActivityCommandType,
  ActivityEntry,
  ActivityKind,
  ActivityOutcome,
  CycleOrder,
  CycleRestMotion,
} from "../runtime/orbit-enums.mjs";

/** @typedef {import("../../activity").CharacterActivity} CharacterActivity */
/** @typedef {import("../../activity").HeaderMotion} HeaderMotion */
/** @typedef {import("../runtime/orbit-characters.mjs").Character} Character */
/** @typedef {import("../runtime/orbit-characters.mjs").OrbitModule} OrbitModule */
/** @typedef {import("../runtime/orbit-characters.mjs").OrbitMotion} OrbitMotion */

/** @type {Set<import("../runtime/orbit-enums.mjs").ActivityKind>} */
const keyboardKinds = new Set([
  ActivityKind.ChinDip,
  ActivityKind.KeyPress,
  ActivityKind.BankAtTheEdge,
  ActivityKind.LeanInToRead,
  ActivityKind.PerkLittleHop,
  ActivityKind.Unfold,
  ActivityKind.ComeCloser,
]);

/** Owns one renderer's ordered activity episodes, independently of its render clock. */
export class CharacterActivityController {
  /** @type {CharacterActivity} */
  requested = { kind: ActivityKind.None, turnId: null };
  /** @type {HeaderMotion | null} */
  motion = null;
  /** @type {import("../runtime/orbit-enums.mjs").ActivityKind} */
  currentKind = ActivityKind.None;
  currentKey = "";
  sequence = 0n;
  episode = 0n;
  /** @type {number | null} */
  caret = null;
  /** @type {{ x: number, y: number, pending: boolean } | null} */
  hover = null;
  /** @type {OrbitMotion | undefined} */
  focusMotion;
  /** @type {number | undefined} */
  focusStarted;
  /** @type {number | undefined} */
  focusId;
  /** @type {number | undefined} */
  editId;
  /** @type {OrbitMotion[] | undefined} */
  idles;
  /** @type {OrbitMotion[] | undefined} */
  thinking;

  /** @param {OrbitModule} engine @param {import("../runtime/orbit-enums.mjs").ActivityKind} kind */
  catalog(engine, kind) {
    if (kind === ActivityKind.Thinking) {
      this.thinking = this.thinking ?? engine.thinkingMotions();
      return this.thinking;
    }
    this.idles = this.idles ?? engine.idleMotions();
    return this.idles;
  }

  /** @param {Character} character */
  bind(character) {
    return (
      character.applyActivity({
        command: ActivityCommandType.Restore,
        sequence: this.sequence,
        episodeId: 0n,
        episodeHighWater: this.episode,
        activity: ActivityKind.None,
        outcome: ActivityOutcome.Neutral,
        entry: ActivityEntry.Sustained,
      }) === ActivityApplyResult.Applied
    );
  }

  /** @param {Character} character */
  suspendKeyboard(character) {
    this.focusMotion = undefined;
    this.focusStarted = undefined;
    this.setCaret(character, null);
  }

  /** Retry the latest target until an outgoing idle clip has returned to Ready.
   * @param {Character} character @param {number} seconds */
  applyHover(character, seconds) {
    if (
      this.hover?.pending &&
      character.setReadyGaze(this.hover.x, this.hover.y, seconds)
    ) {
      this.hover.pending = false;
    }
  }

  /** @param {Character} character @param {number | null} x */
  setCaret(character, x) {
    if (
      x !== this.caret &&
      character.setTypingCaret(x, performance.now() / 1000)
    ) {
      this.caret = x;
    }
  }

  /** @param {Character} character @param {OrbitModule} engine @param {number} seconds */
  presented(character, engine, seconds) {
    if (!this.focusMotion) {
      return true;
    }
    if (this.focusStarted == null) {
      const frame = character.submittedActivity();
      if (
        frame.kind === this.focusMotion.kind &&
        frame.episodeId === this.episode
      ) {
        this.focusStarted = seconds;
      }
      return true;
    }
    if (seconds - this.focusStarted < this.focusMotion.durationSeconds) {
      return true;
    }
    this.focusMotion = undefined;
    this.focusStarted = undefined;
    return this.apply(character, engine, false);
  }

  /** @param {Character} character @param {OrbitModule} engine @param {boolean} fitting */
  apply(character, engine, fitting) {
    const request = this.requested;
    const header = fitting ? null : this.motion;
    const keyboard = header?.keyboard;
    const canType = keyboard?.focused && request.kind === ActivityKind.Ready;
    if (
      !canType ||
      (keyboard.gaze &&
        keyboard.editId !== this.editId &&
        keyboard.focusId === this.focusId)
    ) {
      this.focusMotion = undefined;
      this.focusStarted = undefined;
    }
    if (
      canType &&
      keyboard.focusId !== this.focusId &&
      keyboard.motions.length > 0
    ) {
      const choices = this.catalog(engine, ActivityKind.Ready).filter(
        (clip) =>
          keyboardKinds.has(clip.kind) && keyboard.motions.includes(clip.slug),
      );
      this.focusMotion = choices[Math.floor(Math.random() * choices.length)];
      this.focusStarted = undefined;
    }
    if (!fitting && keyboard?.focused) {
      // A desktop composer can keep DOM focus after sending. Only a new focus
      // event plays a one-shot when editing or the header becomes active again.
      this.focusId = keyboard.focusId;
      this.editId = keyboard.editId;
    }
    const x =
      canType && keyboard.gaze && !this.focusMotion ? keyboard.caret : null;
    if (x == null) {
      this.setCaret(character, null);
    }
    if (
      !header?.cycle ||
      request.kind !== ActivityKind.Ready ||
      x != null ||
      this.focusMotion
    ) {
      this.hover = null;
    }
    const cycle =
      x == null && !this.focusMotion && !this.hover ? header?.cycle : null;
    let kind =
      fitting || x != null
        ? ActivityKind.None
        : (this.focusMotion?.kind ?? request.kind);
    /** @type {import("../runtime/orbit-enums.mjs").ActivityKind[]} */
    let members = [];
    if (cycle) {
      if (kind === ActivityKind.Throttled) {
        members = [kind];
      } else {
        const catalog = this.catalog(engine, kind);
        members = catalog
          .filter(
            (clip) =>
              (cycle.motions == null || cycle.motions.includes(clip.slug)) &&
              !cycle.excluded.includes(clip.slug),
          )
          .map((clip) => clip.kind);
        if (kind === ActivityKind.Thinking && members.length === 0) {
          kind = ActivityKind.None;
        }
      }
    }
    const turn =
      kind === ActivityKind.None ||
      kind === ActivityKind.Throttled ||
      (cycle && kind === ActivityKind.Ready)
        ? null
        : request.turnId;
    const key = JSON.stringify([
      kind,
      turn,
      members,
      cycle?.restMs,
      cycle?.gentleFloat,
      this.focusMotion ? this.focusId : null,
    ]);
    if (this.currentKey !== key) {
      /** @type {import("../runtime/orbit-enums.mjs").ActivityApplyResult} */
      let result = ActivityApplyResult.Applied;
      if (members.length && cycle) {
        // Shuffle the first member too. Native playback owns subsequent passes and rests.
        for (let i = members.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [members[i], members[j]] = [members[j], members[i]];
        }
        result = character.cycle({
          activities: members,
          order: CycleOrder.Shuffled,
          restBetweenPasses: cycle.restMs,
          restMotion: cycle.gentleFloat
            ? CycleRestMotion.GentleFloat
            : CycleRestMotion.Standard,
          seed: Math.floor(Math.random() * 0x100000000),
          sequence: ++this.sequence,
          episodeId: ++this.episode,
        });
      } else if (
        kind !== ActivityKind.None ||
        this.currentKind !== ActivityKind.None
      ) {
        const stop = kind === ActivityKind.None;
        result = character.applyActivity({
          command: stop ? ActivityCommandType.Stop : ActivityCommandType.Start,
          sequence: ++this.sequence,
          episodeId: stop ? this.episode : ++this.episode,
          episodeHighWater: 0n,
          activity: stop ? this.currentKind : kind,
          outcome: ActivityOutcome.Neutral,
          entry: ActivityEntry.Start,
        });
      }
      if (result !== ActivityApplyResult.Applied) {
        return false;
      }
      this.currentKind = members[0] ?? kind;
      this.currentKey = key;
    }
    this.setCaret(character, x);
    return true;
  }
}
