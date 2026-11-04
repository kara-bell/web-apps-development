const statusElement = document.getElementById('server-status');

async function checkServer() {
  try {
    const response = await fetch('/api/health');

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    statusElement.textContent = `Сервер доступен · uptime ${data.uptime} с`;
    statusElement.dataset.state = 'ok';
  } catch (error) {
    statusElement.textContent = 'Сервер недоступен';
    statusElement.dataset.state = 'error';
  }
}

checkServer();
