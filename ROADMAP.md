# Roadmap: Household Finance Management Feature

## Overview
Add a new finances tab to the app that allows household members to track shared expenses, upload receipts, and split costs intelligently using AI. Similar to Splitser and WieBetaaltWat, but integrated with our existing household management system. Expenses contribute to a running total of what each member owes or is owed, with settlements happening at members' convenience.

## UI Mockups

### Main Finance Tab
```
┌─────────────────────────────────────────┐
│ 💰 Finances                    + Add    │
├─────────────────────────────────────────┤
│ Balance Overview                       ▼│
│ ┌─────────────────────────────────────┐ │
│ │ Your Balance: +€24.50              │ │
│ │ ├── John owes you: €35.20         │ │
│ │ ├── You owe Sarah: €12.30         │ │
│ │ └── Mike owes you: €1.60          │ │
│ └─────────────────────────────────────┘ │
│                                        │
│ Recent Expenses                        │
│ ┌────────────────────────────────────┐ │
│ │ 🛒 Albert Heijn         €32.50    │ │
│ │ Paid by John                      │ │
│ │ Added 2h ago                     >│ │
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ 🍕 Domino's Pizza      €25.00    │ │
│ │ Paid by Sarah                     │ │
│ │ Added Yesterday                   >│ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Add Expense Drawer
```
┌─────────────────────────────────────────┐
│ Add Expense                      ✕      │
├─────────────────────────────────────────┤
│ 📷 Upload Receipt                       │
│ ┌─────────────────────────────────────┐ │
│ │     Tap to upload or take photo    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Title: [Albert Heijn Groceries      ]  │
│ Amount: [€ 32.50                    ]  │
│ Paid by: [You                      ▼]  │
│                                         │
│ Split with:                            │
│ ┌─────────────────────────────────────┐ │
│ │ ⚡️ Quick Split:                     │ │
│ │ [Equal] [You pay] [They pay]        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 John                             │ │
│ │ [0%] [25%] [33%] [50%] [100%] [€]  │ │
│ │                                     │ │
│ │ 👤 Sarah                            │ │
│ │ [0%] [25%] [33%] [50%] [100%] [€]  │ │
│ │                                     │ │
│ │ 👤 Mike                             │ │
│ │ [0%] [25%] [33%] [50%] [100%] [€]  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 💡 Tap percentages or enter amount     │
│                                         │
│         [ Add Expense ]                 │
└─────────────────────────────────────────┘
```

### Expense Details Drawer
```
┌─────────────────────────────────────────┐
│ Albert Heijn                     ✕      │
├─────────────────────────────────────────┤
│ €32.50 • March 28                       │
│ Paid by You                             │
│                                         │
│ Receipt                                 │
│ ┌─────────────────────────────────────┐ │
│ │ [Preview of receipt image]          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Split                                   │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 You                              │ │
│ │ Paid €32.50 • Will get €21.67      │ │
│ │                                     │ │
│ │ 👤 John                             │ │
│ │ Pays €10.83                         │ │
│ │                                     │ │
│ │ 👤 Sarah                            │ │
│ │ Pays €10.83                         │ │
│ │                                     │ │
│ │ 👤 Mike                             │ │
│ │ Pays €10.84                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Comments                                │
│ ┌─────────────────────────────────────┐ │
│ │ Sarah: Thanks for groceries! 🙏     │ │
│ └─────────────────────────────────────┘ │
│ [ Write a comment... ]                  │
└─────────────────────────────────────────┘
```

### Settlement Drawer
```
┌─────────────────────────────────────────┐
│ Settle Up                        ✕      │
├─────────────────────────────────────────┤
│ Current Balance: +€24.50               │
│                                         │
│ Quick Actions                           │
│ ┌─────────────────────────────────────┐ │
│ │ [Request All] [Mark All Paid]       │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Settle Individual                       │
│ ┌─────────────────────────────────────┐ │
│ │ 👤 John owes you €24.50            │ │
│ │ [Request] [Mark Paid]               │ │
│ │                                     │ │
│ │ 👤 You owe Sarah €12.30            │ │
│ │ [Pay with Tikkie]                   │ │
│ │                                     │ │
│ │ 👤 Mike owes you €1.60             │ │
│ │ [Request] [Mark Paid]               │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Recent Activity                         │
│ • Mike paid you €15.00 via Tikkie      │
│ • Sarah paid John €22.50 in cash       │
└─────────────────────────────────────────┘
```

### Settlement Overview
```
┌─────────────────────────────────────────┐
│ Balances & Settlements         Settle   │
├─────────────────────────────────────────┤
│ Current Balances                        │
│ ┌─────────────────────────────────────┐ │
│ │ Sarah    +€36.80                    │ │
│ │  └── Owed by:                       │ │
│ │       John (€24.50)                 │ │
│ │       Mike (€12.30)                 │ │
│ ├─────────────────────────────────────┤ │
│ │ John     -€24.50                    │ │
│ │  └── Owes to:                       │ │
│ │       Sarah (€24.50)                │ │
│ ├─────────────────────────────────────┤ │
│ │ Mike     -€12.30                    │ │
│ │  └── Owes to:                       │ │
│ │       Sarah (€12.30)                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Recent Settlements                      │
│ ┌─────────────────────────────────────┐ │
│ │ Mike → John    €15.00              │ │
│ │ Settled via Tikkie • March 15      │ │
│ │                                     │ │
│ │ Sarah → John   €22.50              │ │
│ │ Settled in cash • March 10         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Analytics Dashboard
```
┌─────────────────────────────────────────┐
│ Analytics                    📊 Export  │
├─────────────────────────────────────────┤
│ March 2024                           ▼ │
│                                        │
│ Spending by Category                   │
│ ┌────────────────────────────────────┐ │
│ │  Groceries     ████████   €350    │ │
│ │  Dining        ████       €175    │ │
│ │  Transport     ███        €120    │ │
│ │  Utilities     ██         €80     │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Top Expenses                           │
│ ┌────────────────────────────────────┐ │
│ │ 1. Albert Heijn     €85.30        │ │
│ │ 2. Energy Bill      €75.00        │ │
│ │ 3. Domino's Pizza   €45.50        │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Spending Trend                         │
│ ┌────────────────────────────────────┐ │
│ │     📈                             │ │
│ │   •      •                         │ │
│ │     •  •    •                      │ │
│ └────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

## Phase 1: Core Infrastructure (Sprint 1-2)

### Database Schema
- Create `expenses` table
  - id (UUID)
  - household_id (FK)
  - created_by (user_id)
  - paid_by (user_id)
  - title
  - amount
  - date
  - category
  - receipt_url
  - split_type (equal/percentage/fixed/custom)
  - shared_with (array of user_ids)
  - created_at
  - updated_at

- Create `expense_items` table
  - id (UUID)
  - expense_id (FK)
  - name
  - amount
  - category
  - split_type (equal/percentage/fixed/custom)
  - shared_with (array of user_ids)

- Create `settlements` table
  - id (UUID)
  - household_id (FK)
  - from_user_id
  - to_user_id
  - amount
  - method (cash/tikkie/ideal/other)
  - note
  - settled_at
  - created_at

### API Endpoints
- POST /expenses (create new expense)
- GET /expenses (list expenses)
- PUT /expenses/:id (update expense)
- DELETE /expenses/:id (delete expense)
- POST /expenses/:id/items (add items to expense)
- POST /expenses/:id/settle (mark as settled)

## Phase 2: Basic UI Implementation (Sprint 3)

### New Finance Tab
- Add "Finances" tab to main navigation
- Create basic expense list view
- Implement expense creation form
- Add expense details view
- Create settlement overview screen

### Features
- Running balance tracking
  - Each expense updates the running totals
  - Members can see who they owe and who owes them
  - No immediate settlement required
  - Settlement can be done at any time for any amount

- Flexible Settlement
  - Members can settle partial amounts
  - Multiple settlement methods (cash, Tikkie, iDEAL)
  - Settlement history tracking
  - Optional settlement suggestions

## Phase 3: Receipt Processing (Sprint 4-5)

### AI Integration
- Set up OpenAI Vision API integration
- Implement receipt OCR processing
- Create AI model for categorizing items
- Add smart item assignment based on household patterns

### Receipt Upload Features
- Camera integration for receipt capture
- Image preprocessing for better OCR results
- Receipt preview and manual correction
- Automatic item extraction and categorization
- Match items with existing household products

## Phase 4: Advanced Splitting & Analytics (Sprint 6-7)

### Smart Splitting
- Custom split ratios
- Percentage-based splits
- Item-level splitting
- Split templates for recurring expenses
- Exclude specific members from splits

### Analytics & Insights
- Monthly spending overview
- Category-based analysis
- Personal vs household expenses
- Spending trends and patterns
- Budget tracking and alerts

## Phase 5: Enhanced Features (Sprint 8-9)

### Advanced Features
- Recurring expenses
- Payment integration (iDEAL, Tikkie)
- Export functionality (PDF, CSV)
- Email notifications
- Push notifications for new expenses
- Debt optimization algorithms

### Social Features
- Activity feed
- Comments on expenses
- Shared payment reminders

## Technical Requirements

### Frontend
- New React components for finance management
- Receipt image handling and preview
- Interactive split calculations
- Real-time updates using Supabase subscriptions
- Responsive design for mobile use
- Offline support for receipt uploads

### Backend
- Supabase database schema updates
- OpenAI API integration
- Image processing pipeline
- Secure file storage for receipts
- Background jobs for AI processing
- Webhook handlers for payment callbacks

### Security
- Role-based access control
- Data encryption for financial data
- Secure API endpoints
- Audit logging
- GDPR compliance measures

## Future Considerations

### Potential Features
- Multiple currency support
- Integration with banking APIs
- Advanced budget planning
- Debt consolidation
- Tax report generation
- Mobile app specific features

### Scalability
- Performance optimization for large households
- Caching strategies
- Database indexing
- API rate limiting
- Load balancing considerations

## Success Metrics
- User adoption rate
- Time saved vs manual entry
- OCR accuracy rate
- User satisfaction scores
- Number of active households
- Average processing time
- Error reduction rate

## Timeline
- Phase 1: Weeks 1-2
- Phase 2: Weeks 3-4
- Phase 3: Weeks 5-8
- Phase 4: Weeks 9-12
- Phase 5: Weeks 13-16

Total estimated time: 16 weeks

## Dependencies
- OpenAI API access
- Payment provider integration
- Mobile camera access
- Cloud storage capacity
- Database scalability

## Risks and Mitigation
1. OCR Accuracy
   - Fallback to manual entry
   - Continuous AI model improvement
   - User feedback loop

2. User Adoption
   - Intuitive UI/UX
   - Guided onboarding
   - Feature education

3. Performance
   - Optimize image processing
   - Implement caching
   - Background processing

4. Security
   - Regular security audits
   - Encryption at rest
   - Secure API design

## Success Criteria
- 90% OCR accuracy
- <2s response time
- 80% user satisfaction
- 70% household adoption
- <1% error rate in calculations 