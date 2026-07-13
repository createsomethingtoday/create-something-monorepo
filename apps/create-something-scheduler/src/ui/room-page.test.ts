import { describe, expect, it } from 'vitest';
import { roomPage } from './room-page.js';

describe('roomPage', () => {
  it('renders a Performance-aligned setup gate and owned RealtimeKit surface', () => {
    const html = roomPage({ roomId: 'room_controlled', nonce: 'nonce-controlled' });

    expect(html).toContain('data-room-id="room_controlled"');
    expect(html).toContain('CREATE SOMETHING / ROOM');
    expect(html).toContain('DEVICE CHECK');
    expect(html).toContain('id="display-name"');
    expect(html).toContain('id="join-room"');
    expect(html).toContain('<rtk-meeting');
    expect(html).toContain('show-setup-screen="true"');
    expect(html).toContain('id="end-room"');
    expect(html).toContain('BACKGROUND BLUR');
    expect(html).toContain('Available from the live room controls');
    expect(html).toContain('id="background-blur"');
    expect(html).toContain('id="toggle-microphone"');
    expect(html).toContain('id="toggle-camera"');
    expect(html).toContain('id="toggle-screen-share"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('src="/assets/room-client.js"');
    expect(html).toContain('border-radius:0');
    expect(html).toContain('api.fontshare.com/v2/css?f[]=satoshi@400,500,700&amp;display=swap');
    expect(html).toContain('cdn.jsdelivr.net/npm/@ibm/plex-mono/css/ibm-plex-mono-all.css');
    expect(html).toContain('--sans:"Satoshi"');
    expect(html).toContain('--mono:"IBM Plex Mono"');
    expect(html).toContain('nonce="nonce-controlled"');
    expect(html).not.toContain('providerToken');
    expect(html).not.toContain('?cap=');
  });
});
