(function () {
  const gate = document.querySelector('#inviteGate');
  const title = document.querySelector('#inviteGateTitle');
  const message = document.querySelector('#inviteGateMessage');
  const spinner = document.querySelector('#inviteGateSpinner');
  const retry = document.querySelector('#inviteGateRetry');
  const body = document.body;
  const codeKey = 'helen-ian-invite-code';
  const deviceKey = 'helen-ian-device-id';

  if (!gate || !title || !message || !spinner || !retry) return;

  function normalizeCode(value) {
    return typeof value === 'string' ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
  }

  function getDeviceId() {
    let deviceId = '';
    try {
      deviceId = localStorage.getItem(deviceKey) || '';
      if (!deviceId) {
        deviceId = typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `device-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem(deviceKey, deviceId);
      }
    } catch (error) {
      deviceId = `device-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    }
    return deviceId;
  }

  function getStoredCode() {
    try {
      return normalizeCode(localStorage.getItem(codeKey));
    } catch (error) {
      return '';
    }
  }

  function saveCode(code) {
    try {
      localStorage.setItem(codeKey, code);
    } catch (error) {
      // The API check still protects this page when storage is unavailable.
    }
  }

  function clearStoredCode() {
    try {
      localStorage.removeItem(codeKey);
    } catch (error) {
      // Ignore storage failures; the current page remains locked.
    }
  }

  function setLocked(reason) {
    body.classList.remove('invite-pending');
    body.classList.add('invite-locked');
    spinner.hidden = true;
    retry.hidden = true;
    title.textContent = 'This invitation is invalid';
    if (reason === 'bound') {
      message.textContent = 'This link has already been opened on another device. Helen & Ian can send you your own invitation link.';
    } else if (reason === 'revoked') {
      message.textContent = 'This invitation link is no longer active. Please contact Helen & Ian.';
    } else {
      message.textContent = 'This invitation link is invalid. Please ask Helen & Ian for your personal invitation link.';
    }
  }

  function setError() {
    body.classList.remove('invite-pending');
    body.classList.add('invite-locked');
    spinner.hidden = true;
    retry.hidden = false;
    title.textContent = "We couldn't check your invitation";
    message.textContent = 'Please check your connection and try again.';
  }

  function setPending() {
    body.classList.remove('invite-locked');
    body.classList.add('invite-pending');
    spinner.hidden = false;
    retry.hidden = true;
    title.textContent = 'Checking your invitation…';
    message.textContent = 'One moment while we unseal your envelope.';
  }

  function stripInviteParam() {
    const url = new URL(window.location.href);
    url.searchParams.delete('i');
    url.searchParams.delete('invite');
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async function checkInvite(code) {
    setPending();
    try {
      const response = await fetch('/api/invite-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, deviceId: getDeviceId() })
      });
      const result = await response.json();
      if (!response.ok || !result.valid) {
        if (result.reason === 'unknown' || result.reason === 'invalid') clearStoredCode();
        setLocked(result.reason);
        return;
      }
      saveCode(code);
      body.classList.remove('invite-pending', 'invite-locked');
      gate.remove();
      document.dispatchEvent(new CustomEvent('invite:unlocked', { detail: { label: result.label || '' } }));
    } catch (error) {
      setError();
    }
  }

  retry.addEventListener('click', () => checkInvite(getStoredCode()));

  const url = new URL(window.location.href);
  const urlCode = normalizeCode(url.searchParams.get('i') || url.searchParams.get('invite'));
  const code = urlCode || getStoredCode();
  if (urlCode) {
    saveCode(urlCode);
    stripInviteParam();
  }

  if (!code) {
    setLocked('invalid');
    return;
  }
  checkInvite(code);
}());
