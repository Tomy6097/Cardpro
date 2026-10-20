# 🎉 CardPro Wedding Launch - Action Plan

## 📅 Timeline: Dec 11 → Dec 22 (Wedding Day)

---

## ✅ COMPLETED (Dec 11)
- [x] Twilio account upgraded
- [x] WhatsApp Business API access requested
- [x] Template created and submitted for approval
- [x] Backend code updated with correct variables
- [x] Environment variables configured

---

## ⏳ WAITING (1-3 Days)
- [ ] WhatsApp template approval from Meta
- [ ] Content SID received (starts with HX...)

**Check status**: https://console.twilio.com/us1/develop/sms/content-editor

---

## 🔧 DURING APPROVAL PERIOD (DO NOW!)

### 1. Join Twilio WhatsApp Sandbox (For Testing)
**Why**: Test messages before going live

**How**:
1. Open WhatsApp on your phone
2. Send message to: `+1 (415) 523-8886`
3. Message text: `join <your-sandbox-code>`
4. Wait for confirmation
5. You can now receive test messages!

**Sandbox code**: Check https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp

---

### 2. Verify Event Data is Complete

Check your wedding event has:
- [ ] **Client Name** set (e.g., "James & Anna")
- [ ] **Event Name** set
- [ ] **Date** correct (December 22, 2026)
- [ ] **Time** set (e.g., "Saa 3:00 PM")
- [ ] **Venue** complete
- [ ] **Dress Code** specified
- [ ] **Cover Image** or **Card Template** uploaded

**Test Query**:
```bash
GET http://localhost:5000/api/events/YOUR_EVENT_ID
```

---

### 3. Generate Guest Cards (IMPORTANT!)

**Why**: Variable `{{1}}` (header image) needs guest card URLs

**Options**:

**Option A**: Generate cards for all guests
```bash
POST http://localhost:5000/api/cards/bulk-generate
{
  "eventId": "YOUR_EVENT_ID"
}
```

**Option B**: Use event cover image for all guests
- If guest doesn't have card, system uses `event.coverImage.url`
- This is automatic! ✅

**Recommendation**: Use **Option B** (easier, faster)

---

### 4. Test Current SMS/Email System

While waiting for WhatsApp approval, test existing features:

```bash
# Test single SMS
POST http://localhost:5000/api/invitations/send-sms
{
  "guestId": "GUEST_ID_HERE",
  "customMessage": "Test message"
}
```

Make sure everything else works! ✅

---

### 5. Prepare Guest List

- [ ] All guests added to system
- [ ] Phone numbers correct format (+255XXXXXXXXX)
- [ ] No duplicate guests
- [ ] Guest names spelled correctly

**Export & verify**:
```bash
GET http://localhost:5000/api/guests?event=YOUR_EVENT_ID
```

---

### 6. Check Rate Limiting

Your system sends **1 message per 1.2 seconds** to avoid Twilio limits.

**Calculate send time**:
- 100 guests = ~2 minutes
- 500 guests = ~10 minutes
- 1000 guests = ~20 minutes

**Test with 5 guests first!** ✅

---

### 7. Setup Monitoring

Create activity log endpoint test:

```bash
GET http://localhost:5000/api/activity?event=YOUR_EVENT_ID&action=send_whatsapp
```

This shows all WhatsApp sending activity.

---

## 🚀 AFTER APPROVAL (Day 1-3)

### Step 1: Get Content SID
1. Go to: https://console.twilio.com/us1/develop/sms/content-editor
2. Click on your approved template
3. Copy the **Content SID** (starts with `HX...`)

---

### Step 2: Update .env File

Open `server\.env` and update:

```env
TWILIO_CONTENT_SID=HXyournewcontentsidhere
```

**Current value**: `HX9e7d3b8a1f973c95c208541772e9d9a9`
**Replace with**: Your new approved template SID

---

### Step 3: Restart Server

```bash
# Stop server (Ctrl+C)
# Then start again:
cd server
npm start
```

---

### Step 4: Test with Sandbox Number

```bash
POST http://localhost:5000/api/invitations/test-whatsapp
Content-Type: application/json

{
  "guestName": "John Doe",
  "clientName": "James & Anna",
  "dateTime": "Jumamosi, 22 Desemba 2026 · Saa 3:00 PM",
  "venue": "Golden Tulip Hotel, Dar es Salaam",
  "dressCode": "White and Black",
  "verificationCode": "TEST123",
  "confirmUrl": "https://cardpro-app.onrender.com/event/test?code=TEST123"
}
```

**Expected**: You receive WhatsApp message with:
- ✅ Wedding card image (header)
- ✅ Your name ("John Doe")
- ✅ Couple name ("James & Anna")
- ✅ Date, venue, dress code
- ✅ Button that opens confirmation URL

---

### Step 5: Test with Real Guest

```bash
POST http://localhost:5000/api/invitations/send-whatsapp
{
  "guestId": "REAL_GUEST_ID"
}
```

**Important**: Guest must have joined sandbox first!

---

### Step 6: Move to Production (Request Production Access)

Once sandbox tests work:

1. Go to: https://console.twilio.com/us1/develop/sms/senders/whatsapp
2. Click **"Request to enable my Twilio numbers for WhatsApp"**
3. Fill business verification form
4. Wait 1-2 days for approval

**OR** use sandbox for wedding (works fine for <100 guests if they join!)

---

## 🎊 GO LIVE (Dec 19-21)

### Pre-Flight Checklist

- [ ] Template approved ✅
- [ ] Content SID updated in .env ✅
- [ ] Server restarted ✅
- [ ] Test message received successfully ✅
- [ ] All guest data verified ✅
- [ ] Event details correct ✅
- [ ] Cover image uploaded ✅
- [ ] Confirmation URL tested ✅

---

### Launch Sequence

#### Option A: Bulk Send (All Guests at Once)

```bash
POST http://localhost:5000/api/invitations/send-bulk-whatsapp
{
  "eventId": "YOUR_EVENT_ID",
  "filter": {
    "rsvpStatus": "pending",
    "notSent": true
  }
}
```

**Recommended**: Start with **10 test guests** first!

---

#### Option B: Staged Send (Gradual)

**Phase 1**: VIP Guests (50 guests)
```bash
POST http://localhost:5000/api/invitations/send-bulk-whatsapp
{
  "eventId": "YOUR_EVENT_ID",
  "filter": {
    "ticketType": "VIP"
  }
}
```

**Phase 2**: Wait 1 hour, check for issues

**Phase 3**: Send to remaining guests

---

### Monitor Sending

**Real-time monitoring**:
```bash
GET http://localhost:5000/api/invitations/stats/YOUR_EVENT_ID
```

**Response**:
```json
{
  "success": true,
  "stats": {
    "total": 500,
    "whatsappSent": 450,
    "notSent": 50,
    "delivered": 445,
    "failed": 5
  }
}
```

---

### Handle Failures

If some messages fail:

**Check logs**:
```bash
GET http://localhost:5000/api/activity?event=YOUR_EVENT_ID&action=send_bulk_whatsapp
```

**Retry failed only**:
```bash
POST http://localhost:5000/api/invitations/send-bulk-whatsapp
{
  "eventId": "YOUR_EVENT_ID",
  "filter": {
    "messageStatus": "not_sent"
  }
}
```

---

## 💰 Cost Tracking

**Estimate per message**: $0.015 - $0.035

| Guests | Low Cost | High Cost |
|--------|----------|-----------|
| 100    | $1.50    | $3.50     |
| 500    | $7.50    | $17.50    |
| 1000   | $15.00   | $35.00    |

**Check Twilio balance**: https://console.twilio.com/billing

**Top-up if needed** (keep $20+ buffer)

---

## 🚨 Emergency Backup Plan

If WhatsApp fails on launch day:

### Plan B: SMS Fallback

```bash
POST http://localhost:5000/api/invitations/send-bulk-sms
{
  "eventId": "YOUR_EVENT_ID",
  "filter": {
    "messageStatus": "not_sent"
  }
}
```

**SMS works immediately** - no template approval needed!

---

## 📞 Support Contacts

### Twilio Issues
- Console: https://console.twilio.com
- Support: https://support.twilio.com
- Live chat: Available 24/7

### WhatsApp Issues
- Status: https://www.facebook.com/business/help
- Template status: Check Twilio Console

### CardPro Backend Issues
- Check logs: `server/logs/`
- Activity log: `/api/activity`
- Health check: `http://localhost:5000/health`

---

## ✅ Wedding Day (Dec 22)

### Morning Setup (8:00 AM)

- [ ] Server running ✅
- [ ] Check all guests received invitations
- [ ] Review RSVP confirmations
- [ ] Scanner ready for check-in

### Guest Arrival

Use scanner:
```
GET http://localhost:5000/api/scanner/scan
```

Tracks guest attendance in real-time!

---

## 🎊 POST-WEDDING

### Thank You Messages (Optional)

Create new template:
- **Name**: `cardpro_thankyou`
- **Body**: Thank you message with wedding photos
- Send to all who attended

---

## 📊 Success Metrics

Track these:

- **Delivery rate**: Target >95%
- **RSVP rate**: Target >70%
- **Attendance rate**: Actual vs confirmed
- **Average response time**: How fast guests confirm

**Dashboard**: `http://localhost:3000/dashboard`

---

## 🎯 Next Actions (RIGHT NOW!)

### Priority 1 (Today - Dec 11)
1. [ ] Join Twilio WhatsApp Sandbox (5 minutes)
2. [ ] Verify event data complete (10 minutes)
3. [ ] Test with 3 sandbox numbers (30 minutes)

### Priority 2 (Dec 12-13)
1. [ ] Prepare final guest list
2. [ ] Check all phone numbers
3. [ ] Upload event cover image

### Priority 3 (After Approval)
1. [ ] Update TWILIO_CONTENT_SID
2. [ ] Test with real guests (5-10 people)
3. [ ] Bulk send to all guests

---

## 📝 Notes

- Template approval usually takes 1-2 days (weekdays faster)
- Test everything in sandbox first!
- Keep Twilio balance above $20
- Monitor first 50 sends closely
- Have SMS backup ready

---

**Questions? Issues? Let me know!** 🚀

---

**Last Updated**: December 11, 2026
**Wedding Date**: December 22, 2026 (11 days away!)
**Status**: Template submitted, waiting for approval ⏳
