# RevenueGuard

**Billing automation for MSPs.** Connect your PSA (ConnectWise, HaloPSA, Autotask) to Stripe with true bidirectional sync — eliminate manual reconciliation, catch failed payments before they churn, and automate your billing workflow.

---

## 🩹 Pain Points We Solve

Based on competitive research of 10+ billing tools (Chargebee MSP, Gradient, ScalePad, native PSA billing), we identified 6 critical gaps:

### 1. **The Reconciliation Nightmare**
**Problem:** PSA → Billing is automated. Billing → PSA is manual. Your team spends 10-20 hours/month matching Stripe payments to ConnectWise invoices.

**Our Solution:** True bidirectional sync. When a payment succeeds in Stripe, it auto-updates your PSA. When an invoice is created in PSA, it syncs to Stripe instantly.

### 2. **Transaction Fee Death by a Thousand Cuts**
**Problem:** Gradient charges 1% of all transactions. On $500K ARR, that's $5K/year — before their $199-599/mo base fee.

**Our Solution:** Flat fee pricing. $49-199/mo. No percentage. Period.

### 3. **MSP-Specific Usage Pricing Doesn't Exist**
**Problem:** Generic billing tools handle per-seat/flat fee. They can't do per-endpoint, per-GB backup, per-ticket, or project hours billing.

**Our Solution:** Native MSP pricing models built-in. Pull usage data directly from Datto RMM, NinjaOne, or via API.

### 4. **Native PSA Billing is a Prison**
**Problem:** ConnectWise/Autotask billing forces you into their limitations. No Stripe flexibility. No modern dunning. No churn prediction.

**Our Solution:** Best of both worlds — PSA workflow + Stripe's payment infrastructure.

### 5. **Churn Detection is Reactive**
**Problem:** You find out a customer is leaving when they cancel. Or worse, when you notice they haven't paid in 3 months.

**Our Solution:** Predictive churn risk scoring. Flags at-risk accounts before they fail.

### 6. **SMB MSPs Are Ignored**
**Problem:** Chargebee MSP starts at $549/mo. Too expensive for 10-50 seat MSPs.

**Our Solution:** Built for the $1M-$10M ARR MSP. Affordable from day one.

---

## 🚀 Current MVP Features

### Dashboard
- **MRR Overview:** $47,500 with +$3.2K vs last month
- **Active Subscriptions:** 23 (2 new this week)
- **Failed Payments:** $3,200 at risk (1 customer)
- **Revenue at Risk:** $8,400 flagged for churn

### Subscription Management
- Customer list with status badges (Active / At Risk / Past Due)
- Renewal dates with warnings
- Amount tracking per customer

### Churn Risk Analysis
- **Risk Score:** 67% elevated (1 high risk, 2 medium, 20 low)
- Visual risk bar with gradient
- At-a-glance risk breakdown

### Activity Feed
- Real-time sync events (ConnectWise ↔ Stripe)
- Payment failure alerts
- New subscription notifications
- Auto-reconciliation status

### Integration Status
| Platform | Status | Last Sync |
|----------|--------|-----------|
| ConnectWise | ✅ Connected | 12 min ago |
| Stripe | ✅ Real-time webhooks | Active |
| Datto RMM | ✅ Connected | 2 hours ago |

---

## 📊 Mock Data Reference

The MVP includes realistic mock data for testing:

| Customer | MRR | Status | Risk Level |
|----------|-----|--------|------------|
| TechCorp Industries | $8,500/mo | Active | Low |
| NextGen Solutions | $6,200/mo | Active | Low |
| DataRise Analytics | $4,800/mo | At Risk | Medium |
| CloudBridges Ltd | $3,200/mo | Past Due | High |
| SecureVault MSP | $2,900/mo | At Risk | Medium |

---

## 🔌 How to Add Integrations

### ConnectWise Integration

1. **Get API Keys**
   - Login to ConnectWise Manage
   - Go to System → Members → API Members
   - Create new API member "RevenueGuard"
   - Generate Public/Private keys

2. **Configure Webhook**
   - Navigate to System → Setup → Integrations
   - Add webhook URL: `https://api.revenueguard.io/webhooks/connectwise`
   - Subscribe to events: Invoice.Created, Payment.Received, Agreement.Updated

3. **Test Connection**
   ```bash
   curl -X POST https://api.revenueguard.io/integrations/connectwise/test \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"company_id": "yourcompany", "public_key": "xxx", "private_key": "yyy"}'
   ```

### Stripe Integration

1. **Connect Account**
   - In RevenueGuard, go to Settings → Integrations → Stripe
   - Click "Connect with Stripe"
   - Complete OAuth flow

2. **Configure Webhooks**
   - RevenueGuard receives webhooks automatically
   - Verify endpoint: `https://api.revenueguard.io/webhooks/stripe`

3. **Required Events**
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

### HaloPSA Integration (Beta)

1. **API Key Setup**
   - Settings → API → Generate Key
   - Scopes required: Tickets, Customers, Invoices, Agreements

2. **Webhook Configuration**
   - Add webhook: `https://api.revenueguard.io/webhooks/halopsa`
   - Events: invoice.created, payment.received

### Datto RMM Integration

1. **Generate API Token**
   - Admin → Account Settings → API
   - Create token with read scope on Devices and Customers

2. **Sync Schedule**
   - Usage data syncs every 4 hours by default
   - Real-time available with webhook setup

---

## 🛠️ Development Guide

### Local Setup

```bash
# Clone repo
git clone https://github.com/thisisprabha/revenueguard.git
cd revenueguard

# Start local server
python -m http.server 8000
# or
npx serve .

# Open in browser
open http://localhost:8000
```

### Project Structure

```
revenueguard/
├── index.html          # Main dashboard
├── README.md           # This file
├── css/
│   └── styles.css      # Component styles
├── js/
│   ├── app.js          # Main application logic
│   ├── api.js          # API client (mock/stub)
│   └── charts.js       # Chart.js configurations
├── integrations/
│   ├── connectwise.js
│   ├── stripe.js
│   ├── halopsa.js
│   └── dattormm.js
└── docs/
    └── api-reference.md
```

### Adding a New Integration

1. Create `integrations/[platform].js`:
```javascript
// integrations/newpsa.js
class NewPSAIntegration {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async syncCustomers() {
    // Fetch customers from PSA
  }

  async syncInvoices() {
    // Fetch invoices from PSA
  }

  async receiveWebhook(payload) {
    // Handle incoming webhooks
  }
}

export default NewPSAIntegration;
```

2. Register in `js/app.js`:
```javascript
import NewPSAIntegration from '../integrations/newpsa.js';

this.integrations.register('newpsa', NewPSAIntegration);
```

3. Add webhook route in backend (when built):
```python
@app.route('/webhooks/newpsa', methods=['POST'])
def handle_newpsa_webhook():
    # Process webhook
    pass
```

---

## 📈 Feature Roadmap

### Phase 1: MVP (Current)
- [x] Dashboard with mock data
- [x] Subscription list view
- [x] Basic churn risk UI
- [x] Activity feed
- [ ] Real API integration
- [ ] Authentication

### Phase 2: Core Functionality
- [ ] ConnectWise bidirectional sync
- [ ] Stripe webhook handling
- [ ] Invoice reconciliation engine
- [ ] Dunning management
- [ ] Email notifications

### Phase 3: Advanced Features
- [ ] HaloPSA integration
- [ ] Autotask integration
- [ ] Datto RMM usage syncing
- [ ] Metered billing (per-endpoint, per-GB)
- [ ] Churn prediction ML model

### Phase 4: Scale
- [ ] Multi-tenant architecture
- [ ] Team management
- [ ] Advanced reporting
- [ ] Stripe Tax integration
- [ ] Mobile app

---

## 💰 Pricing Strategy

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | $49/mo | 1 PSA, <$100K Stripe volume, basic sync |
| **Growth** | $99/mo | 2 PSAs, unlimited volume, reconciliation, dunning |
| **Scale** | $199/mo | Multi-PSA, priority support, custom metrics, API access |

**No transaction fees. Ever.**

---

## 🔄 Comparison: Research vs Built

| From Research | MVP Status | Gap |
|-------------|------------|-----|
| True bidirectional sync | UI scaffolding ready | Needs real API integration |
| Flat fee pricing | Documented, not implemented | Needs billing system |
| MSP usage pricing | UI mock for display | Needs RMM data connection |
| Churn prediction | Static risk score (67%) | Needs ML model + actual data |
| Dunning management | "Send dunning email" button | Needs email automation logic |
| Multi-PSA support | UI shows single connection | Needs abstracted PSA adapter |
| Tax compliance | Not in MVP | Nice-to-have for later |

**Verdict:** MVP captures the UI/UX vision. Next step is wiring real APIs.

---

## 🎯 Target Customers

**Ideal customer profile:**
- 10-100 technician MSPs
- $1M-$10M ARR
- Using ConnectWise, Autotask, HaloPSA, or Syncro
- Currently spending 5-20 hrs/month on manual reconciliation
- Frustrated with Chargebee pricing or Gradient's transaction fees

**Not for:**
- Solo MSPs (use native PSA billing)
- Enterprise MSPs $10M+ (Chargebee MSP fits better)

---

## 🔗 Resources

- [Competitive Analysis](./docs/competitive-analysis.md)
- [API Reference](./docs/api-reference.md)
- [Integration Guides](./docs/integrations/)
- [Changelog](./CHANGELOG.md)

---

## 🐛 Known Issues

1. Risk score is static (67%) — not calculated from real data
2. Activity feed shows mock timestamps
3. "Sync Now" button is UI only (no backend)
4. Integrations status always shows "Connected"

---

## 📞 Support

- Docs: https://docs.revenueguard.io
- Email: support@revenueguard.io
- Slack: [Join our MSP community](https://revenueguard.io/slack)

---

**Built with 💚 for MSPs who are tired of billing spreadsheets.**
