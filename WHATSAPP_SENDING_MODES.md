# 📱 WhatsApp Invitation Sending - Two Modes

CardPro supports **TWO modes** of sending WhatsApp invitations:

---

## 🎨 **MODE 1: Template Mode** (RECOMMENDED for Wedding!)

### What You Get:
- ✅ **Header Image** (wedding card/cover photo)
- ✅ **Formatted Message** with emoji
- ✅ **Confirmation Button** (direct link to RSVP)
- ✅ **Professional Look**
- ✅ **Higher engagement rate**

### Requirements:
- Template must be **approved by Meta** (1-3 days)
- `TWILIO_CONTENT_SID` must be set in `.env`
- Template variables match exactly

### How to Use:

#### Single Guest:
```bash
POST /api/invitations/send-whatsapp
{
  "guestId": "GUEST_ID_HERE"
}
```

#### Bulk Send:
```bash
POST /api/invitations/send-bulk-whatsapp
{
  "eventId": "EVENT_ID_HERE"
}
```

**That's it!** System automatically uses template if `TWILIO_CONTENT_SID` is configured.

---

## 📝 **MODE 2: Plain Text Mode** (No Approval Needed!)

### What You Get:
- ✅ **Simple text message**
- ✅ **No waiting for approval**
- ✅ **Works immediately**
- ✅ **Customizable message**
- ❌ No image
- ❌ No button (link is plain text)

### Requirements:
- Only Twilio credentials needed
- No template approval required

### How to Use:

#### Single Guest with Custom Message:
```bash
POST /api/invitations/send-whatsapp
{
  "guestId": "GUEST_ID_HERE",
  "customMessage": "Mpendwa {guestName}, tunayo furaha kukualika kwenye harusi yetu! Tarehe: {date}, Mahali: {venue}. Thibitisha: {confirmUrl}"
}
```

#### Bulk Send with Custom Message:
```bash
POST /api/invitations/send-bulk-whatsapp
{
  "eventId": "EVENT_ID_HERE",
  "customMessage": "Dear {guestName}, you are invited to {eventName} on {date} at {venue}. RSVP: {confirmUrl}"
}
```

#### Force Plain Text (Even if Template Exists):
```bash
POST /api/invitations/send-whatsapp
{
  "guestId": "GUEST_ID_HERE",
  "useTemplate": false,
  "customMessage": "Your custom message here"
}
```

---

## 🎯 **How System Decides Which Mode to Use:**

```
┌─────────────────────────────────────────────────────┐
│  DECISION LOGIC (Priority Order)                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. customMessage provided?                         │
│     → YES: Use PLAIN TEXT MODE ✅                   │
│                                                     │
│  2. useTemplate = false?                            │
│     → YES: Use PLAIN TEXT MODE ✅                   │
│                                                     │
│  3. TWILIO_CONTENT_SID configured?                  │
│     → YES: Use TEMPLATE MODE 🎨                     │
│     → NO:  Use PLAIN TEXT MODE ✅                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 📊 **Comparison Table:**

| Feature | Template Mode | Plain Text Mode |
|---------|--------------|-----------------|
| **Header Image** | ✅ Yes | ❌ No |
| **Formatted Layout** | ✅ Yes | ❌ No |
| **Button Link** | ✅ Yes (clickable button) | ⚠️ Plain text URL |
| **Approval Required** | ✅ Yes (1-3 days) | ❌ No |
| **Setup Time** | 3-5 days | Immediate |
| **Cost per Message** | ~$0.015-0.035 | ~$0.015-0.035 |
| **Engagement Rate** | 🔥 Higher | 📝 Standard |
| **Best For** | Wedding, Corporate Events | Urgent, Simple Messages |

---

## 🎯 **RECOMMENDED FOR YOUR WEDDING:**

### ✅ **USE TEMPLATE MODE** because:
1. **Professional appearance** - impress your guests!
2. **Higher RSVP rate** - button makes confirmation easier
3. **Image support** - show wedding card directly
4. **Better branding** - looks official and trustworthy
5. **Modern experience** - guests expect rich content

---

## 💡 **EXAMPLES:**

### Example 1: Wedding Invitations (Template Mode - Default)

```bash
# Just send - system uses template automatically!
POST /api/invitations/send-bulk-whatsapp
{
  "eventId": "673abc123...",
  "filter": {
    "rsvpStatus": "pending"
  }
}
```

**What Guest Receives:**
```
┌─────────────────────────────────────┐
│  [BEAUTIFUL WEDDING CARD IMAGE]      │
├─────────────────────────────────────┤
│ Mpendwa John Doe,                   │
│                                     │
│ James & Anna wanayo furaha          │
│ kukualika kwenye harusi yao!        │
│                                     │
│ 📅 Tarehe: Jumamosi, 22 Desemba    │
│ 📍 Mahali: Golden Tulip Hotel      │
│ 👔 Dress Code: White and Black     │
│                                     │
│ Code yako: CP7821                   │
├─────────────────────────────────────┤
│  [Thibitisha Kuhudhuria] 🔗         │
└─────────────────────────────────────┘
```

---

### Example 2: Urgent Reminder (Plain Text Mode)

```bash
# Quick reminder without template
POST /api/invitations/send-bulk-whatsapp
{
  "eventId": "673abc123...",
  "customMessage": "Hi {guestName}! Wedding is TOMORROW at {venue}. See you at {time}! 🎉",
  "filter": {
    "rsvpStatus": "confirmed"
  }
}
```

**What Guest Receives:**
```
Hi John Doe! Wedding is TOMORROW at 
Golden Tulip Hotel. See you at 3:00 PM! 🎉
```

---

### Example 3: Test Single Guest (Plain Text)

```bash
# Test without using template
POST /api/invitations/send-whatsapp
{
  "guestId": "guest123...",
  "useTemplate": false,
  "customMessage": "Test message to {guestName} - please ignore!"
}
```

---

## 🔧 **TEMPLATE VARIABLES YOU CAN USE:**

In `customMessage` field, use these placeholders:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| `{guestName}` | John Doe | Guest's full name |
| `{eventName}` | James & Anna Wedding | Event name |
| `{date}` | Jumamosi, 22 Desemba 2026 | Formatted date |
| `{time}` | 3:00 PM | Event time |
| `{venue}` | Golden Tulip Hotel | Venue location |
| `{dressCode}` | White and Black | Dress code |
| `{confirmUrl}` | https://cardpro.app/... | RSVP confirmation link |
| `{verificationCode}` | CP7821 | Guest verification code |

---

## ⚙️ **CONFIGURATION:**

### Enable Template Mode:
1. Get template approved by Meta
2. Copy Content SID from Twilio Console
3. Add to `.env`:
   ```env
   TWILIO_CONTENT_SID=HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```
4. Restart server
5. Done! System automatically uses template

### Disable Template Mode:
**Option A**: Remove from `.env`:
```env
# TWILIO_CONTENT_SID=HXxxx...  (comment out)
```

**Option B**: Pass `useTemplate: false` in API call:
```json
{
  "guestId": "...",
  "useTemplate": false
}
```

---

## 🚨 **TROUBLESHOOTING:**

### Issue: Template not sending
**Solution**: Check these:
```bash
# 1. Verify Content SID is set
echo %TWILIO_CONTENT_SID%

# 2. Check template approval status
# Go to: https://console.twilio.com/us1/develop/sms/content-editor

# 3. Test with plain text first
POST /api/invitations/send-whatsapp
{
  "guestId": "...",
  "useTemplate": false,
  "customMessage": "Test"
}
```

### Issue: Want to switch modes mid-campaign
**No problem!** Just:
- Template → Plain text: Add `useTemplate: false`
- Plain text → Template: Remove `customMessage` field

---

## 📊 **RESPONSE FORMAT:**

Both modes return:

```json
{
  "success": true,
  "message": "WhatsApp message sent successfully",
  "mode": "template"  // or "plain_text"
}
```

For bulk sends:
```json
{
  "success": true,
  "mode": "template",
  "sent": 450,
  "failed": 5,
  "errors": [
    { "guest": "Guest Name", "error": "Invalid phone number" }
  ]
}
```

---

## 🎊 **FINAL RECOMMENDATION:**

### For Your Wedding (Dec 22):
1. ✅ **Use Template Mode** (main invitations)
2. ✅ **Use Plain Text Mode** (last-minute reminders)

### Setup Plan:
```
Week 1: Create & submit template (DONE ✅)
Week 2: Wait for approval, prepare data
Week 3: Send via TEMPLATE MODE to all guests
Day Before: Send reminder via PLAIN TEXT MODE
```

---

**Questions? Need help choosing which mode to use? Let me know!** 🚀

---

**Last Updated**: December 11, 2026
**Version**: 2.0.0 (Dual-mode support)
