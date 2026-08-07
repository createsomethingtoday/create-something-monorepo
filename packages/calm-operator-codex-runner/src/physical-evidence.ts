export type PhysicalSerialEvent = {
  at: string;
  line: string;
};

export type PhysicalPassEvidence = {
  firmware_version: string;
  task_id: string;
  action_id: string;
  device_nonce: string;
  request_id: string;
  receipt_status: 'accepted';
  physical_selects: 2;
  armed_at: string;
  confirmed_at: string;
  accepted_at: string;
  serial_events: PhysicalSerialEvent[];
};

export class PhysicalEvidenceError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'PhysicalEvidenceError';
  }
}

export class PhysicalPassCollector {
  private firmwareVersion = '';
  private readonly selects: number[] = [];
  private taskId = '';
  private actionId = '';
  private deviceNonce = '';
  private requestId = '';
  private armedAt = '';
  private confirmedAt = '';
  private acceptedAt = '';
  private complete = false;
  private readonly events: PhysicalSerialEvent[] = [];

  push(lineInput: string, atInput: string | number | Date = new Date()): void {
    const line = lineInput.trim();
    if (!line.includes('[ink]')) return;
    const at = timestamp(atInput);

    const boot = line.match(/^\[ink\] boot firmware=([^\s]+)$/);
    if (boot) {
      this.firmwareVersion = boot[1]!;
      this.record(at, line);
      return;
    }
    if (!line.startsWith('[ink][codex]')) return;
    this.record(at, line);

    if (this.complete) {
      if (line.includes('physical_select')) {
        throw new PhysicalEvidenceError('duplicate_select', 'A third physical select followed the accepted pass.');
      }
      return;
    }

    if (/^\[ink\]\[codex\] physical_select source=(B|EXT)$/.test(line)) {
      if (this.firmwareVersion !== '0.2.0') {
        throw new PhysicalEvidenceError('unverified_firmware', 'Physical selection occurred without firmware 0.2.0 boot evidence.');
      }
      this.selects.push(Date.parse(at));
      if (this.selects.length > 2) {
        throw new PhysicalEvidenceError('duplicate_select', 'More than two physical selects occurred in one pass.');
      }
      if (this.selects.length === 2 && this.selects[1]! - this.selects[0]! > 15_000) {
        throw new PhysicalEvidenceError('arm_timeout', 'The physical confirmation exceeded the 15-second arm window.');
      }
      return;
    }

    const armed = line.match(/^\[ink\]\[codex\] armed task=([^\s]+) action=([^\s]+)$/);
    if (armed) {
      if (this.selects.length !== 1) {
        throw new PhysicalEvidenceError('arm_without_select', 'Arm evidence did not follow exactly one physical select.');
      }
      this.taskId = armed[1]!;
      this.actionId = armed[2]!;
      this.armedAt = at;
      return;
    }

    const confirmed = line.match(
      /^\[ink\]\[codex\] confirmed task=([^\s]+) action=([^\s]+) nonce=([^\s]+)$/
    );
    if (confirmed) {
      if (this.selects.length !== 2 || !this.armedAt) {
        throw new PhysicalEvidenceError('confirm_without_arm', 'Confirmation lacked the exact physical arm sequence.');
      }
      if (confirmed[1] !== this.taskId || confirmed[2] !== this.actionId) {
        throw new PhysicalEvidenceError('action_changed', 'Task or action changed between arm and confirmation.');
      }
      this.deviceNonce = confirmed[3]!;
      this.confirmedAt = at;
      return;
    }

    if (line === '[ink][codex] arm_expired' && this.selects.length > 0) {
      throw new PhysicalEvidenceError('arm_expired', 'The physical arm expired before confirmation.');
    }

    const state = line.match(
      /^\[ink\]\[codex\] state=([^\s]+) request=([^\s]*) receipt=([^\s]*)$/
    );
    if (!state) return;
    const [, status, requestId, receiptStatus] = state;
    if (['rejected', 'expired', 'offline'].includes(status!) && this.selects.length > 0) {
      throw new PhysicalEvidenceError('terminal_failure', `Pager entered ${status} during the physical pass.`);
    }
    if ((status === 'queued' || status === 'claimed') && this.confirmedAt) {
      if (!requestId) throw new PhysicalEvidenceError('missing_request', 'Queued pager state had no bridge request ID.');
      if (this.requestId && this.requestId !== requestId) {
        throw new PhysicalEvidenceError('request_changed', 'Bridge request ID changed during the physical pass.');
      }
      this.requestId = requestId!;
      return;
    }
    if (status === 'accepted') {
      if (!this.confirmedAt || !this.requestId || requestId !== this.requestId || receiptStatus !== 'accepted') {
        throw new PhysicalEvidenceError('receipt_mismatch', 'Accepted pager state did not match the physical bridge request.');
      }
      this.acceptedAt = at;
      this.complete = true;
    }
  }

  done(): boolean {
    return this.complete;
  }

  result(): PhysicalPassEvidence {
    if (!this.complete || this.selects.length !== 2) {
      throw new PhysicalEvidenceError('incomplete', 'Physical pass evidence is incomplete.');
    }
    return {
      firmware_version: this.firmwareVersion,
      task_id: this.taskId,
      action_id: this.actionId,
      device_nonce: this.deviceNonce,
      request_id: this.requestId,
      receipt_status: 'accepted',
      physical_selects: 2,
      armed_at: this.armedAt,
      confirmed_at: this.confirmedAt,
      accepted_at: this.acceptedAt,
      serial_events: [...this.events]
    };
  }

  private record(at: string, line: string): void {
    this.events.push({ at, line: line.slice(0, 600) });
  }
}

function timestamp(value: string | number | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new PhysicalEvidenceError('invalid_time', 'Serial event time is invalid.');
  return date.toISOString();
}
