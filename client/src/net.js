/**
 * WebSocket クライアント — docs/design/09-protocol.md §2
 *
 * ここだけがトランスポートを知っている（ポート/アダプタの adapter 側）。
 * 上の層には「メッセージが来た」ことだけを渡す。座標の解釈はしない。
 *
 * ★ 送るのは「進みたい向き」だけ。座標は送らない（§5.1）。
 */

export function createNet({ url, on = () => {} }) {
  let ws = null, seq = 0, closed = false, retry = 0;
  const state = { ready: false, rtt: null, lastTickAt: 0 };

  function connect() {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onopen = () => { retry = 0; state.ready = true; on({ t: '_open' }); };
    ws.onclose = () => {
      state.ready = false;
      on({ t: '_close' });
      if (closed) return;
      // 再接続は指数バックオフ。回線が細い環境を前提にする（02 §5）
      const wait = Math.min(8000, 500 * 2 ** retry++);
      setTimeout(connect, wait);
    };
    ws.onerror = () => {};
    ws.onmessage = ev => {
      let m;
      try { m = JSON.parse(ev.data); } catch { return; }
      if (m.t === 'tick') state.lastTickAt = performance.now();
      on(m);
    };
  }
  connect();

  const send = msg => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(msg)); };

  return {
    state,
    /** 移動の意思。10Hz で呼ぶ（送信レートはサーバ側で 15Hz に制限されている） */
    intent(dx, dy) {
      seq = (seq + 1) & 0xffff;
      send({ t: 'intent', dx, dy, seq });
      return seq;
    },
    setStatus: status => send({ t: 'setStatus', status }),
    sit: seatId => send({ t: 'sit', seatId }),
    stand: () => send({ t: 'stand' }),
    use: objectId => send({ t: 'use', objectId }),
    knock: targetEntityId => send({ t: 'knock', targetEntityId }),
    knockAnswer: (fromEntityId, accept) => send({ t: 'knockAnswer', fromEntityId, accept }),
    close() { closed = true; ws?.close(); },
  };
}
