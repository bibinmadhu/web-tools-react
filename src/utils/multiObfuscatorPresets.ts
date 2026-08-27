import { CodeSetInput } from './multiObfuscator';

export interface MultiObfuscatorPreset {
  id: string;
  name: string;
  category: string;
  description: string;
  sets: [CodeSetInput, CodeSetInput]; // Guaranteed 2 sets of TS/JS + HTML
}

export const MULTI_OBFUSCATOR_PRESETS: MultiObfuscatorPreset[] = [
  {
    id: 'ecommerce-cart-checkout',
    name: 'E-Commerce Catalog & Checkout Flow',
    category: 'Full-Stack Web App',
    description: 'Product Catalog filtering logic & markup with synchronized Checkout Modal and Cart State management.',
    sets: [
      {
        id: 'set-1-catalog',
        name: 'Set 1: Product Catalog (TypeScript + HTML)',
        scriptLanguage: 'typescript',
        scriptCode: `// TypeScript Product Catalog Controller
interface ProductItem {
  itemId: string;
  title: string;
  category: string;
  unitPrice: number;
  inventoryCount: number;
}

class CatalogManager {
  private products: ProductItem[] = [];
  private activeCategory: string = 'all';

  constructor() {
    this.initCatalog();
    this.bindEvents();
  }

  private initCatalog(): void {
    this.products = [
      { itemId: 'p-101', title: 'Noise-Cancelling Headphones', category: 'Audio', unitPrice: 249.99, inventoryCount: 18 },
      { itemId: 'p-102', title: 'Mechanical Gaming Keyboard', category: 'Peripherals', unitPrice: 129.50, inventoryCount: 34 },
      { itemId: 'p-103', title: '4K Ultra-Wide Monitor 34"', category: 'Monitors', unitPrice: 589.00, inventoryCount: 9 },
    ];
  }

  public renderCatalog(): void {
    const gridContainer = document.getElementById('catalog-grid-wrapper');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';
    const filteredList = this.products.filter(item => 
      this.activeCategory === 'all' || item.category.toLowerCase() === this.activeCategory.toLowerCase()
    );

    filteredList.forEach(item => {
      const card = document.createElement('div');
      card.className = 'product-card item-row active-card';
      card.innerHTML = \`
        <h4 class="product-title">\${item.title}</h4>
        <span class="product-badge">\${item.category}</span>
        <p class="product-price">$\${item.unitPrice.toFixed(2)}</p>
        <button class="add-to-cart-btn btn-primary" onclick="handleAddToCart('\${item.itemId}')">Add to Cart</button>
      \`;
      gridContainer.appendChild(card);
    });
  }

  private bindEvents(): void {
    const filterSelect = document.getElementById('category-filter-select');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.activeCategory = target.value;
        this.renderCatalog();
      });
    }
  }
}

const catalogApp = new CatalogManager();
catalogApp.renderCatalog();`,
        htmlCode: `<!-- Product Catalog Markup (Set 1) -->
<div id="catalog-section" class="catalog-container store-wrapper">
  <div class="header-banner">
    <h2 class="section-heading">Featured Hardware & Accessories</h2>
    <p class="sub-caption">Explore premium devices with 2-year guaranteed manufacturer warranty.</p>
  </div>

  <div class="filter-controls-bar">
    <label for="category-filter-select" class="filter-label">Filter Department:</label>
    <select id="category-filter-select" class="form-select filter-dropdown">
      <option value="all">All Departments</option>
      <option value="Audio">Audio</option>
      <option value="Peripherals">Peripherals</option>
      <option value="Monitors">Monitors</option>
    </select>
  </div>

  <!-- Dynamic Catalog Grid Insertion -->
  <div id="catalog-grid-wrapper" class="catalog-grid layout-responsive">
    <div class="product-card item-row active-card">
      <h4 class="product-title">Noise-Cancelling Headphones</h4>
      <span class="product-badge">Audio</span>
      <p class="product-price">$249.99</p>
      <button class="add-to-cart-btn btn-primary" onclick="handleAddToCart('p-101')">Add to Cart</button>
    </div>
  </div>
</div>`
      },
      {
        id: 'set-2-checkout',
        name: 'Set 2: Cart & Checkout Payment (JavaScript + HTML)',
        scriptLanguage: 'javascript',
        scriptCode: `// JavaScript Cart & Checkout Payment Dispatcher
let cartState = {
  items: [],
  discountCode: '',
  discountPercent: 0,
  taxRate: 0.0825
};

function handleAddToCart(productId) {
  const existing = cartState.items.find(i => i.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cartState.items.push({ id: productId, quantity: 1, price: 199.99 });
  }
  updateCartDrawerUI();
  showToastNotification('Item added to shopping bag!');
}

function calculateOrderTotal() {
  const subtotal = cartState.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (cartState.discountPercent / 100);
  const taxAmount = (subtotal - discountAmount) * cartState.taxRate;
  const grandTotal = subtotal - discountAmount + taxAmount;

  return {
    subtotal: subtotal.toFixed(2),
    discount: discountAmount.toFixed(2),
    tax: taxAmount.toFixed(2),
    total: grandTotal.toFixed(2)
  };
}

function updateCartDrawerUI() {
  const countBadge = document.getElementById('cart-badge-count');
  const summaryBox = document.getElementById('order-summary-container');
  const totals = calculateOrderTotal();

  if (countBadge) {
    countBadge.textContent = cartState.items.reduce((s, i) => s + i.quantity, 0);
  }

  if (summaryBox) {
    summaryBox.innerHTML = \`
      <div class="summary-row"><span class="label">Subtotal:</span> <span class="val">$\${totals.subtotal}</span></div>
      <div class="summary-row"><span class="label">Discount:</span> <span class="val">-\$\${totals.discount}</span></div>
      <div class="summary-row"><span class="label">Tax (8.25%):</span> <span class="val">$\${totals.tax}</span></div>
      <div class="summary-row total-highlight"><span class="label">Grand Total:</span> <span class="val">$\${totals.total}</span></div>
    \`;
  }
}

function executePaymentOrder(event) {
  event.preventDefault();
  const paymentBtn = document.getElementById('submit-payment-button');
  if (paymentBtn) {
    paymentBtn.disabled = true;
    paymentBtn.textContent = 'Processing Transaction...';
  }

  setTimeout(() => {
    alert('Payment authorized successfully! Order ID: #ORD-98421');
    cartState.items = [];
    updateCartDrawerUI();
  }, 1200);
}`,
        htmlCode: `<!-- Cart & Checkout Modal Markup (Set 2) -->
<div id="checkout-modal-overlay" class="modal-backdrop modal-active">
  <div class="modal-dialog checkout-panel">
    <div class="modal-header">
      <h3 class="modal-title">Your Shopping Cart & Review</h3>
      <span id="cart-badge-count" class="cart-pill-badge">1</span>
    </div>

    <div class="modal-body">
      <!-- Order Summary Card -->
      <div id="order-summary-container" class="order-summary-card checkout-box">
        <div class="summary-row"><span class="label">Subtotal:</span> <span class="val">$249.99</span></div>
        <div class="summary-row"><span class="label">Discount:</span> <span class="val">-$0.00</span></div>
        <div class="summary-row"><span class="label">Tax (8.25%):</span> <span class="val">$20.62</span></div>
        <div class="summary-row total-highlight"><span class="label">Grand Total:</span> <span class="val">$270.61</span></div>
      </div>

      <!-- Payment Form -->
      <form id="payment-checkout-form" class="payment-form-wrapper" onsubmit="executePaymentOrder(event)">
        <div class="input-group">
          <label for="card-holder-input" class="form-label">Cardholder Full Name</label>
          <input id="card-holder-input" type="text" class="form-control" placeholder="Jane Doe" required />
        </div>

        <button id="submit-payment-button" type="submit" class="checkout-action-btn btn-primary">
          Authorize Payment & Complete Order
        </button>
      </form>
    </div>
  </div>
</div>`
      }
    ]
  },
  {
    id: 'auth-and-dashboard',
    name: 'Authentication & Analytics Dashboard',
    category: 'Enterprise SaaS',
    description: 'JWT token auth controller & login modal paired with metrics charts and telemetry streamer.',
    sets: [
      {
        id: 'set-1-auth',
        name: 'Set 1: Auth & Session Manager (TypeScript + HTML)',
        scriptLanguage: 'typescript',
        scriptCode: `// TypeScript Authentication & Token Controller
interface UserSession {
  userId: string;
  emailAddress: string;
  authToken: string;
  sessionExpiresAt: number;
}

class AuthenticationService {
  private currentSession: UserSession | null = null;

  public async handleUserLogin(event: Event): Promise<void> {
    event.preventDefault();
    const emailInput = document.getElementById('login-email-field') as HTMLInputElement;
    const passwordInput = document.getElementById('login-password-field') as HTMLInputElement;
    const submitButton = document.getElementById('auth-submit-btn') as HTMLButtonElement;

    if (!emailInput || !passwordInput) return;

    submitButton.disabled = true;
    submitButton.textContent = 'Verifying Credentials...';

    const loginPayload = {
      user: emailInput.value,
      secret: passwordInput.value,
      timestamp: Date.now()
    };

    // Simulate encrypted handshake
    console.info('Transmitting authentication challenge:', loginPayload.user);
    this.currentSession = {
      userId: 'usr_849204',
      emailAddress: loginPayload.user,
      authToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token',
      sessionExpiresAt: Date.now() + 3600000
    };

    const statusBanner = document.getElementById('auth-status-message');
    if (statusBanner) {
      statusBanner.className = 'status-banner success-state';
      statusBanner.textContent = 'Login verified! Redirecting to secure cluster...';
    }
  }
}

const authManager = new AuthenticationService();`,
        htmlCode: `<!-- Authentication Modal (Set 1) -->
<div id="auth-modal-wrapper" class="auth-container card-modal">
  <div class="auth-header">
    <h2 class="auth-title">Secure Portal Access</h2>
    <p class="auth-subtitle">Enter enterprise credentials for hardware-token verification.</p>
  </div>

  <div id="auth-status-message" class="status-banner info-state">
    System active. Dual-layer encryption initialized.
  </div>

  <form id="user-login-form" class="auth-form" onsubmit="authManager.handleUserLogin(event)">
    <div class="form-field-group">
      <label for="login-email-field" class="field-label">Corporate Email</label>
      <input id="login-email-field" type="email" class="input-text" placeholder="admin@enterprise.io" required />
    </div>

    <div class="form-field-group">
      <label for="login-password-field" class="field-label">Security Passphrase</label>
      <input id="login-password-field" type="password" class="input-text" placeholder="••••••••••••" required />
    </div>

    <button id="auth-submit-btn" type="submit" class="btn-authenticate action-primary">
      Authorize Access Token
    </button>
  </form>
</div>`
      },
      {
        id: 'set-2-dashboard',
        name: 'Set 2: Telemetry & Metrics Dashboard (JavaScript + HTML)',
        scriptLanguage: 'javascript',
        scriptCode: `// JavaScript Telemetry & KPI Aggregator
const telemetryState = {
  activeNodes: 128,
  throughputMbps: 4520,
  latencyMs: 14.2,
  errorCount: 0
};

function refreshTelemetryMetrics() {
  const nodesEl = document.getElementById('metric-active-nodes');
  const throughputEl = document.getElementById('metric-throughput');
  const latencyEl = document.getElementById('metric-latency');

  // Random fluctuation for live stream demo
  telemetryState.throughputMbps += Math.floor(Math.random() * 40 - 20);
  telemetryState.latencyMs = +(telemetryState.latencyMs + (Math.random() * 0.4 - 0.2)).toFixed(1);

  if (nodesEl) nodesEl.textContent = telemetryState.activeNodes;
  if (throughputEl) throughputEl.textContent = telemetryState.throughputMbps + ' Mbps';
  if (latencyEl) latencyEl.textContent = telemetryState.latencyMs + ' ms';
}

function flushClusterCache() {
  const statusEl = document.getElementById('telemetry-status-banner');
  if (statusEl) {
    statusEl.textContent = 'Flushing Redis cluster node cache...';
    setTimeout(() => {
      statusEl.textContent = 'All 128 cluster nodes synchronized.';
    }, 800);
  }
}

setInterval(refreshTelemetryMetrics, 2000);`,
        htmlCode: `<!-- Telemetry Dashboard Metrics (Set 2) -->
<div id="telemetry-dashboard-panel" class="dashboard-wrapper metrics-grid">
  <div class="panel-header">
    <h3 class="panel-title">Real-Time Cluster Health Monitor</h3>
    <span id="telemetry-status-banner" class="status-indicator live-pulse">Monitoring Active</span>
  </div>

  <div class="metrics-cards-row">
    <div class="kpi-card active-nodes-box">
      <span class="kpi-label">Active Worker Nodes</span>
      <h4 id="metric-active-nodes" class="kpi-value">128</h4>
    </div>

    <div class="kpi-card throughput-box">
      <span class="kpi-label">Network Throughput</span>
      <h4 id="metric-throughput" class="kpi-value">4520 Mbps</h4>
    </div>

    <div class="kpi-card latency-box">
      <span class="kpi-label">Average P99 Latency</span>
      <h4 id="metric-latency" class="kpi-value">14.2 ms</h4>
    </div>
  </div>

  <div class="controls-toolbar">
    <button id="flush-cache-button" class="btn-warning control-action" onclick="flushClusterCache()">
      Flush Cache & Rebalance
    </button>
  </div>
</div>`
      }
    ]
  },
  {
    id: 'kanban-and-notifications',
    name: 'Kanban Task Board & Live Notification Center',
    category: 'Productivity Application',
    description: 'Task board drag controller with synchronized toast alert engine and audio dispatcher.',
    sets: [
      {
        id: 'set-1-kanban',
        name: 'Set 1: Kanban Task Board (TypeScript + HTML)',
        scriptLanguage: 'typescript',
        scriptCode: `// TypeScript Kanban Task Board Controller
interface TaskItem {
  taskId: string;
  summary: string;
  columnStatus: 'todo' | 'in_progress' | 'done';
  priorityLevel: 'low' | 'medium' | 'high';
}

class KanbanBoardManager {
  private taskList: TaskItem[] = [
    { taskId: 'task-1', summary: 'Upgrade Database Migration Scripts', columnStatus: 'in_progress', priorityLevel: 'high' },
    { taskId: 'task-2', summary: 'Refactor OAuth2 Refresh Token Lifecycle', columnStatus: 'todo', priorityLevel: 'medium' },
    { taskId: 'task-3', summary: 'Verify Zero-Trust Firewall Rules', columnStatus: 'done', priorityLevel: 'high' },
  ];

  public renderTasks(): void {
    const todoColumn = document.getElementById('column-todo-items');
    const inProgressColumn = document.getElementById('column-progress-items');
    const doneColumn = document.getElementById('column-done-items');

    if (!todoColumn || !inProgressColumn || !doneColumn) return;

    todoColumn.innerHTML = '';
    inProgressColumn.innerHTML = '';
    doneColumn.innerHTML = '';

    this.taskList.forEach(task => {
      const card = document.createElement('div');
      card.className = \`task-card priority-\${task.priorityLevel} draggable-card\`;
      card.innerHTML = \`
        <p class="task-summary">\${task.summary}</p>
        <span class="task-id-badge">#\${task.taskId}</span>
        <button class="advance-task-btn" onclick="advanceTaskProgress('\${task.taskId}')">Move Next &rarr;</button>
      \`;

      if (task.columnStatus === 'todo') todoColumn.appendChild(card);
      else if (task.columnStatus === 'in_progress') inProgressColumn.appendChild(card);
      else doneColumn.appendChild(card);
    });
  }
}

const kanbanApp = new KanbanBoardManager();
kanbanApp.renderTasks();`,
        htmlCode: `<!-- Kanban Board Markup (Set 1) -->
<div id="kanban-board-container" class="kanban-wrapper board-grid">
  <div class="board-column todo-lane">
    <h3 class="column-title">Backlog / To-Do</h3>
    <div id="column-todo-items" class="cards-list-container">
      <div class="task-card priority-medium draggable-card">
        <p class="task-summary">Refactor OAuth2 Refresh Token Lifecycle</p>
        <span class="task-id-badge">#task-2</span>
        <button class="advance-task-btn" onclick="advanceTaskProgress('task-2')">Move Next &rarr;</button>
      </div>
    </div>
  </div>

  <div class="board-column in-progress-lane">
    <h3 class="column-title">In Active Sprint</h3>
    <div id="column-progress-items" class="cards-list-container">
      <div class="task-card priority-high draggable-card">
        <p class="task-summary">Upgrade Database Migration Scripts</p>
        <span class="task-id-badge">#task-1</span>
        <button class="advance-task-btn" onclick="advanceTaskProgress('task-1')">Move Next &rarr;</button>
      </div>
    </div>
  </div>

  <div class="board-column completed-lane">
    <h3 class="column-title">Completed & Verified</h3>
    <div id="column-done-items" class="cards-list-container">
      <div class="task-card priority-high draggable-card">
        <p class="task-summary">Verify Zero-Trust Firewall Rules</p>
        <span class="task-id-badge">#task-3</span>
      </div>
    </div>
  </div>
</div>`
      },
      {
        id: 'set-2-notifications',
        name: 'Set 2: Notification Center & Audio Alerts (JavaScript + HTML)',
        scriptLanguage: 'javascript',
        scriptCode: `// JavaScript Live Toast Dispatcher
function advanceTaskProgress(taskId) {
  showToastNotification('Task #' + taskId + ' progressed to next stage!', 'success');
}

function showToastNotification(message, alertType = 'info') {
  const toastContainer = document.getElementById('toast-alerts-tray');
  if (!toastContainer) return;

  const toastItem = document.createElement('div');
  toastItem.className = 'toast-alert-card ' + alertType + '-toast alert-active';
  toastItem.innerHTML = \`
    <span class="toast-icon">⚡</span>
    <span class="toast-message-body">\${message}</span>
    <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
  \`;

  toastContainer.appendChild(toastItem);

  setTimeout(() => {
    if (toastItem.parentElement) {
      toastItem.remove();
    }
  }, 4000);
}

function clearAllNotifications() {
  const toastContainer = document.getElementById('toast-alerts-tray');
  if (toastContainer) {
    toastContainer.innerHTML = '';
  }
}`,
        htmlCode: `<!-- Notification Center Markup (Set 2) -->
<div id="notification-center-drawer" class="notifications-panel drawer-wrapper">
  <div class="drawer-header">
    <h4 class="drawer-heading">System Alerts & Notifications</h4>
    <button id="clear-alerts-button" class="btn-clear text-link" onclick="clearAllNotifications()">
      Clear History
    </button>
  </div>

  <!-- Real-time Toast Notifications Tray -->
  <div id="toast-alerts-tray" class="toast-container stack-layout">
    <div class="toast-alert-card info-toast alert-active">
      <span class="toast-icon">⚡</span>
      <span class="toast-message-body">Sync complete: Sprint backlog updated across 3 nodes.</span>
      <button class="toast-close-btn" onclick="this.parentElement.remove()">&times;</button>
    </div>
  </div>
</div>`
      }
    ]
  }
];
