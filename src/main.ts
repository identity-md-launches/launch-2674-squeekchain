const toggle = document.querySelector<HTMLButtonElement>('#wheel-toggle');
const artwork = document.querySelector<HTMLElement>('.hero-art');
const wheelStatus = document.querySelector<HTMLElement>('#wheel-status');

if (toggle && artwork && wheelStatus) {
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const running = toggle.getAttribute('aria-pressed') !== 'true';
    toggle.setAttribute('aria-pressed', String(running));
    artwork.classList.toggle('is-running', running);
    const label = toggle.querySelector('span');
    if (label) label.textContent = running ? '暂停跑轮' : '转动跑轮';
    wheelStatus.textContent = running ? '插画演示 · 跑轮转动中' : '插画演示 · 跑轮休息中';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && toggle.getAttribute('aria-pressed') === 'true') toggle.click();
  });
}

export {};
