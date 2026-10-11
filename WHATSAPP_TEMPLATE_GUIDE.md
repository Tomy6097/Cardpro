# 📱 WhatsApp Wedding Invitation Template Setup Guide

## 🎯 Overview
Mwongozo wa kusetup WhatsApp Business Template kwa kutumia Twilio na Meta WhatsApp Business API.

---

## 📋 Template Variables (Correct Order)

Your CardPro system sends these variables in this exact order:

| Variable | Field Name | Example Value | Source |
|----------|-----------|---------------|---------|
| `{{1}}` | **Card Image URL** | `https://res.cloudinary.com/.../card.jpg` | Guest card / Event cover image |
| `{{2}}` | **Guest Name** | `John Doe` | Guest.guestName |
| `{{3}}` | **Client Name** | `James & Anna` | Event.clientName (Bride & Groom) |
| `{{4}}` | **Event Name** | `James & Anna Wedding` | Event.name |
| `{{5}}` | **Date & Time** | `Jumamosi, 22 Desemba 2026 · Saa 3:00 PM` | Event.date + Event.time |
| `{{6}}` | **Venue** | `Golden Tulip Hotel, Dar es Salaam` | Event.venue |
| `{{7}}` | **Dress Code** | `White and Black` | Event.dressCode |
| `{{8}}` | **Confirmation URL** | `https://cardpro.app/event/wedding-abc123?code=CP7821` | Auto-generated RSVP link |
| `{{9}}` | **Verification Code** | `CP7821` | Guest.verificationCode |

---

## 🎨 Template Structure (Swahili Version - Recommended)

### Template Name: `cardpro_wedding_invitation_sw`

### Language: `sw` (Swahili)

### Category: `UTILITY` (Best for event invitations - Meta approval faster)

---

### **HEADER (Media)**
```
Type: IMAGE
Image URL Variable: {{1}}
```

---

### **BODY**
```
Mpendwa {{2}},

{{3}} wanayo furaha kukualika kwenye harusi yao!

📅 Tarehe: {{5}}
📍 Mahali: {{6}}
👔 Dress Code: {{7}}

Tafadhali thibitisha kuhudhuria kwa kubofya button hapa chini.

Code yako: {{9}}
```

---

### **FOOTER** (Optional)
```
Powered by CardPro Events
```

---

### **BUTTONS**

#### Option A: Call-to-Action Button (RECOMMENDED)
```
Type: URL
Button Text: Thibitisha Kuhudhuria
URL: {{8}}
```

#### Option B: Quick Reply Button (Alternative)
```
Type: QUICK_REPLY
Button Text: ✅ Thibitisha
```

---

## 🛠️ Step-by-Step Setup in Twilio Console

### Step 1: Access Twilio Content Template Builder
1. Login to [Twilio Console](https://console.twilio.com)
2. Navigate to: **Messaging → Content Template Builder**
3. Click **Create new template**

---

### Step 2: Configure Template

#### A. Basic Info
- **Friendly Name**: `CardPro Wedding Invitation (Swahili)`
- **Language**: `sw` (Swahili)
- **Template Type**: Select **WhatsApp**
- **Category**: `UTILITY` ⚠️ Important: UTILITY templates get approved faster!

---

#### B. Header Section
1. Click **Add Header**
2. Select **Media** → **Image**
3. Click **Add variable** → This creates `{{1}}`
4. Sample Image URL: `https://res.cloudinary.com/demo/image/upload/wedding_card_sample.jpg`

---

#### C. Body Section
Copy the Swahili body text above. Variables will be automatically numbered `{{2}}` through `{{9}}`.

**Important**: Don't manually type `{{2}}` - use the **Insert variable** button!

---

#### D. Footer Section (Optional)
```
Powered by CardPro Events
```

---

#### E. Buttons Section
1. Click **Add button**
2. Select **URL** type
3. Button text: `Thibitisha Kuhudhuria`
4. URL type: **Dynamic**
5. URL: Click **Insert variable** for `{{8}}`

Final URL format: `{{8}}`

---

### Step 3: Submit for Approval

1. Click **Submit for Approval**
2. **Review time**: 1-3 business days (Meta approval)
3. **Approval status**: Check Twilio Console → Content Templates

---

## 🔑 Environment Variables to Set

Add these to your `.env` file:

```env
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Test Phone (your WhatsApp number for testing)
TWILIO_TEST_TO=whatsapp:+255XXXXXXXXX
```

---

## 🧪 Testing Your Template

### Test via API Endpoint

```bash
POST http://localhost:5000/api/invitations/test-whatsapp
Content-Type: application/json

{
  "cardImageUrl": "https://res.cloudinary.com/your-cloud/wedding-card.jpg",
  "guestName": "John Doe",
  "clientName": "James & Anna",
  "eventName": "James & Anna Wedding",
  "date": "Jumamosi, 22 Desemba 2026 · Saa 3:00 PM",
  "venue": "Golden Tulip Hotel, Dar es Salaam",
  "dressCode": "White and Black",
  "confirmUrl": "https://cardpro.app/event/test?code=CP7821",
  "verificationCode": "CP7821"
}
```

---

## 📊 Template Preview (How it will look)

```
┌─────────────────────────────────────┐
│  [WEDDING CARD IMAGE]                │
├─────────────────────────────────────┤
│ Mpendwa John Doe,                   │
│                                     │
│ James & Anna wanayo furaha          │
│ kukualika kwenye harusi yao!        │
│                                     │
│ 📅 Tarehe: Jumamosi, 22 Desemba    │
│    2026 · Saa 3:00 PM              │
│ 📍 Mahali: Golden Tulip Hotel      │
│ 👔 Dress Code: White and Black     │
│                                     │
│ Tafadhali thibitisha kuhudhuria    │
│ kwa kubofya button hapa chini.      │
│                                     │
│ Code yako: CP7821                   │
├─────────────────────────────────────┤
│ Powered by CardPro Events           │
├─────────────────────────────────────┤
│  [Thibitisha Kuhudhuria] 🔗         │
└─────────────────────────────────────┘
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Template not approved"
**Solution**: Wait 1-3 business days. Check approval status in Twilio Console.

### Issue 2: "Invalid parameter: ContentVariables"
**Solution**: Make sure all variables in template match the order sent by backend.

### Issue 3: "Sandbox recipient not joined"
**Solution**: Before testing, send `join <sandbox-keyword>` to Twilio WhatsApp sandbox number.

### Issue 4: "Image not displaying"
**Solution**: 
- Image URL must be publicly accessible (HTTPS)
- Max size: 5MB
- Formats: JPG, PNG
- Use Cloudinary URLs for best results

---

## 💰 Pricing (As of 2026)

- **Twilio fee**: $0.005 per message
- **Meta fee**: Varies by country (Tanzania: ~$0.01-0.03 per message)
- **Total cost estimate**: ~$0.015-0.035 per WhatsApp invitation

**Example**: 500 guests = ~$7.50 - $17.50 total cost

---

## ✅ Production Checklist

Before going live with 500+ guests:

- [ ] Template approved by Meta
- [ ] Test with 5+ different phone numbers
- [ ] Verify image displays correctly
- [ ] Button redirects to correct URL
- [ ] Rate limiting configured (1.2s delay between messages)
- [ ] Error logging enabled
- [ ] Backup plan ready (SMS fallback)

---

## 📞 Support Contacts

- **Twilio Support**: https://support.twilio.com
- **WhatsApp Business API**: https://business.whatsapp.com
- **CardPro Backend Issues**: Check server logs at `/api/activity`

---

## 🎉 Alternative Template (English Version)

If you need English version:

### Body:
```
Dear {{2}},

{{3}} joyfully invite you to their wedding celebration!

📅 Date: {{5}}
📍 Venue: {{6}}
👔 Dress Code: {{7}}

Please confirm your attendance by clicking the button below.

Your code: {{9}}
```

---

**Last Updated**: December 2026
**Version**: 1.0.0
**Author**: CardPro Development Team
