// Componente para manejar el historial de cabinas
class CabinHistoryManager {
  constructor() {
    this.currentCabin = 'all';
    this.availableCabins = [];
    this.isLoading = false;
    this.init();
  }

  async init() {
    await this.loadAvailableCabins();
    this.setupEventListeners();
    this.loadCabinHistory();
  }

  async loadAvailableCabins() {
    try {
      const response = await fetch('/api/dashboard');
      const data = await response.json();
      
      if (data.ok && data.data.availableCabins) {
        this.availableCabins = data.data.availableCabins;
        this.updateCabinSelector();
      }
    } catch (error) {
      console.error('Error cargando cabinas disponibles:', error);
    }
  }

  updateCabinSelector() {
    const selector = document.getElementById('cabinSelector');
    if (!selector) return;

    // Limpiar opciones existentes
    selector.innerHTML = '<option value="all">Todas las cabinas</option>';

    // Agregar opciones de cabinas
    this.availableCabins.forEach(cabin => {
      const option = document.createElement('option');
      option.value = cabin.id;
      option.textContent = `${cabin.codigo} (${cabin.estado})`;
      selector.appendChild(option);
    });

    // Establecer valor actual
    selector.value = this.currentCabin;
  }

  setupEventListeners() {
    const selector = document.getElementById('cabinSelector');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.currentCabin = e.target.value;
        this.loadCabinHistory();
      });
    }
  }

  async loadCabinHistory() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.showLoading();

    try {
      const url = this.currentCabin === 'all' 
        ? '/api/dashboard/cabin/all/history?limit=50'
        : `/api/dashboard/cabin/${this.currentCabin}/history?limit=50`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        this.renderHistoryTable(data.data.historicalData);
        this.updateRecordCount(data.data.totalRecords);
      } else {
        this.showError('Error cargando historial: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
      this.showError('Error de conexión al cargar historial');
    } finally {
      this.isLoading = false;
      this.hideLoading();
    }
  }

  renderHistoryTable(data) {
    const tbody = document.querySelector('#cabinHistoryTable tbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-gray-500 py-8">
            No hay datos de historial disponibles
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(record => `
      <tr>
        <td class="font-medium">${record.cabinId}</td>
        <td>${record.timestamp}</td>
        <td>${record.position.x.toFixed(1)}, ${record.position.y.toFixed(1)}</td>
        <td>${record.velocity.toFixed(2)} m/s</td>
        <td>${record.vibration.toFixed(4)} RMS</td>
        <td>-</td>
        <td>
          <span class="status-badge ${this.getStatusClass(record.status)}">
            ${this.getStatusText(record.status)}
          </span>
        </td>
      </tr>
    `).join('');
  }

  getStatusClass(status) {
    switch (status?.toLowerCase()) {
      case 'warning': return 'warning';
      case 'alert': return 'alert';
      default: return 'normal';
    }
  }

  getStatusText(status) {
    switch (status?.toLowerCase()) {
      case 'warning': return 'Advertencia';
      case 'alert': return 'Alerta';
      default: return 'Normal';
    }
  }

  updateRecordCount(total) {
    const countElement = document.getElementById('recordCount');
    if (countElement) {
      countElement.textContent = `${total} registros`;
    }
  }

  showLoading() {
    const tbody = document.querySelector('#cabinHistoryTable tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="loading-indicator">
            <div class="loading-spinner"></div>
            Cargando historial...
          </td>
        </tr>
      `;
    }
  }

  hideLoading() {
    // El loading se oculta cuando se renderiza la tabla
  }

  showError(message) {
    const tbody = document.querySelector('#cabinHistoryTable tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-red-500 py-8">
            ${message}
          </td>
        </tr>
      `;
    }
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Solo inicializar si existe la tabla de historial
  if (document.getElementById('cabinHistoryTable')) {
    new CabinHistoryManager();
  }
});

// Función global para recargar historial (útil para botones de refresh)
window.refreshCabinHistory = function() {
  if (window.cabinHistoryManager) {
    window.cabinHistoryManager.loadCabinHistory();
  }
};
