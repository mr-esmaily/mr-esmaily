// Hello World button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('helloBtn');
  btn?.addEventListener('click', () => {
    alert('Hello World 👋');
  });
});

// Simple update UI (triggered by SW when a new version is installed)
let waitingWorker;
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_WAITING') {
    waitingWorker = event.source;
    showUpdateToast();
  }
});

function showUpdateToast() {
  const toast = document.getElementById('updateToast');
  const refreshBtn = document.getElementById('refreshBtn');
  toast?.classList.remove('hidden');
  refreshBtn?.addEventListener('click', () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
  });
}