# 🚨 WhatsApp Error Messages - User Guide

## Overview
CardPro now shows **detailed, user-friendly error messages** when WhatsApp sending fails. No more generic "Failed" - you'll see exactly what went wrong and how to fix it!

---

## ✅ What Changed?

### **BEFORE:**
```
❌ "WhatsApp message sent successfully"
   (But nothing was actually sent!)
```

### **AFTER:**
```
❌ "📱 Recipient has not joined WhatsApp Sandbox"
   Suggestion: Wait for WhatsApp Business approval 
   or ask guest to join sandbox.
   Code: 63016
```

---

## 🔍 Common Error Messages & Solutions

### **1. Template Not Approved**

**Error:**
```
❌ WhatsApp template not found or not approved yet.
Suggestion: Wait for template approval (1-3 days) or use Custom Text mode instead.
Code: 20404
```

**What it means:**
Your template is still waiting for Meta approval.

**Solutions:**
- ✅ **Wait 1-3 business days** for approval
- ✅ **Use SMS instead** (works immediately)
- ✅ Check template status: https://console.twilio.com/us1/develop/sms/content-editor

---

### **2. Sandbox Not Joined**

**Error:**
```
❌ Recipient has not joined WhatsApp Sandbox or WhatsApp Business API not enabled.
Suggestion: Either: 1) Wait for WhatsApp Business approval, or 2) Ask guest to join sandbox.
Code: 63016
```

**What it means:**
You're using Twilio Sandbox, and the guest hasn't joined it yet.

**Solutions:**
- ✅ **Wait for WhatsApp Business approval** (1-3 days) - then no sandbox needed!
- ✅ **Use SMS instead** for now
- ⚠️ **DON'T** ask 500 guests to join sandbox (not practical)

---

### **3. Insufficient Balance**

**Error:**
```
❌ Insufficient Twilio balance.
Suggestion: Top up your Twilio account at console.twilio.com/billing
Code: 20429
```

**What it means:**
Your Twilio account is out of credit.

**Solutions:**
- ✅ **Top up Twilio balance**: https://console.twilio.com/billing
- ✅ Add at least **$20** for 500 guests (WhatsApp ~$15 total)
- ✅ Check current balance in Twilio Console

---

### **4. Invalid Phone Number**

**Error:**
```
❌ Invalid phone number format.
Suggestion: Check guest phone number: Must be in format +255XXXXXXXXX
Code: 21211
```

**What it means:**
Guest's phone number is in wrong format.

**Solutions:**
- ✅ **Fix phone format**: Must start with `+` and country code
- ✅ Example: `+255754696878` ✅ (correct)
- ❌ Example: `0754696878` ❌ (wrong - missing +255)
- ✅ Go to Guests page and edit phone number

---

### **5. Number Not on WhatsApp**

**Error:**
```
❌ This phone number is not enabled for WhatsApp or does not have WhatsApp.
Suggestion: Use SMS instead, or verify the guest has WhatsApp installed.
Code: 21608
```

**What it means:**
The phone number doesn't have WhatsApp installed/activated.

**Solutions:**
- ✅ **Use SMS tab instead** - works for any phone
- ✅ **Verify guest has WhatsApp** - ask them directly
- ✅ **Update phone number** if guest uses different number for WhatsApp

---

### **6. Rate Limit Exceeded**

**Error:**
```
❌ Too many messages sent. Rate limit exceeded.
Suggestion: Wait a few minutes and try again. System sends 1 message per 1.2 seconds.
Code: 429
```

**What it means:**
You're sending messages too fast (Twilio has limits).

**Solutions:**
- ✅ **Wait 5-10 minutes** then try again
- ✅ System already has **1.2s delay** between messages (automatic)
- ✅ **Don't spam send button** multiple times!

---

### **7. Authentication Failed**

**Error:**
```
❌ Twilio credentials invalid. Check your Account SID and Auth Token.
Suggestion: Go to Settings → Messaging and verify your Twilio credentials.
Code: 20003
```

**What it means:**
Your Twilio Account SID or Auth Token is wrong/expired.

**Solutions:**
- ✅ **Go to Settings → Messaging**
- ✅ **Re-enter credentials** from Twilio Console
- ✅ Get credentials: https://console.twilio.com (Account Info section)

---

### **8. Network Timeout**

**Error:**
```
❌ Request timeout. Network issue or Twilio service slow.
Suggestion: Check internet connection and try again in a few minutes.
Code: ETIMEDOUT
```

**What it means:**
Network connection problem or Twilio is slow.

**Solutions:**
- ✅ **Check internet connection**
- ✅ **Wait 2-3 minutes** and try again
- ✅ **Restart server** if problem persists

---

## 📊 Error Priority Guide

### **High Priority (Fix NOW!):**
```
🔥 Insufficient Balance → Top up Twilio
🔥 Invalid Credentials → Fix in Settings
🔥 Invalid Phone Numbers → Fix in Guests page
```

### **Medium Priority (Wait for approval):**
```
⏳ Template Not Approved → Wait 1-3 days
⏳ Sandbox Not Joined → Wait for Business API approval
```

### **Low Priority (Temporary issues):**
```
⏱️ Rate Limit → Wait 5 minutes
⏱️ Network Timeout → Retry
```

---

## 🎯 Quick Decision Tree

```
┌─────────────────────────────────────────┐
│  WhatsApp Send Failed?                  │
├─────────────────────────────────────────┤
│                                         │
│  Check Error Message:                   │
│                                         │
│  ├─ "Template not approved"             │
│  │  → Wait or use SMS                   │
│  │                                      │
│  ├─ "Sandbox not joined"                │
│  │  → Wait for approval or use SMS      │
│  │                                      │
│  ├─ "Insufficient balance"              │
│  │  → Top up Twilio NOW!                │
│  │                                      │
│  ├─ "Invalid phone number"              │
│  │  → Fix guest phone format            │
│  │                                      │
│  ├─ "Number not on WhatsApp"            │
│  │  → Use SMS instead                   │
│  │                                      │
│  └─ Other errors                        │
│     → Check suggestion in error message │
│                                         │
└─────────────────────────────────────────┘
```

---

## 💡 Pro Tips

### **Tip 1: Test First!**
```bash
# Always test with 1-2 guests before sending to all 500
POST /api/invitations/send-whatsapp
{
  "guestId": "test_guest_id"
}
```

### **Tip 2: Monitor Activity Log**
```
Go to: Events → Your Event → Activity Log
See all send attempts + error details
```

### **Tip 3: Use SMS as Backup**
```
If WhatsApp keeps failing:
1. Switch to SMS tab
2. Send to all guests
3. Try WhatsApp again later
```

### **Tip 4: Check Twilio Console Logs**
```
URL: https://console.twilio.com/monitor/logs/sms
See detailed Twilio error logs
Filter by: Date, Status, Error Code
```

---

## 📞 Support Resources

### **Twilio Issues:**
- Console: https://console.twilio.com
- Logs: https://console.twilio.com/monitor/logs
- Support: https://support.twilio.com
- Status: https://status.twilio.com

### **Template Issues:**
- Content Editor: https://console.twilio.com/us1/develop/sms/content-editor
- WhatsApp Docs: https://www.twilio.com/docs/whatsapp

### **CardPro Issues:**
- Activity Log: Go to Events → Activity Log
- Health Check: `GET /health`
- Server Logs: Check Render dashboard

---

## ✅ Success Indicators

### **Message Sent Successfully:**
```
✅ WhatsApp message sent successfully.
Mode: template

Guest Status Updated:
- messageStatus: "whatsapp_sent"
- messageChannel: "whatsapp"
- messageSentAt: 2026-12-11T10:30:00Z
```

### **What You'll See:**
- ✅ Green success toast
- ✅ Guest count updated in stats
- ✅ Activity log shows "send_whatsapp" action
- ✅ Guest receives message on their phone

---

## 🚨 When to Contact Support

Contact Twilio Support if:
- ❌ Error persists after 24 hours
- ❌ Balance deducted but message not sent
- ❌ Template approved but still showing "not found"
- ❌ Getting error codes not listed in this guide

**Before contacting:**
1. ✅ Check Twilio Console logs
2. ✅ Note the error code
3. ✅ Check Twilio Status page
4. ✅ Have your Account SID ready

---

## 📝 Summary

**Key Improvements:**
- ✅ **Detailed error messages** instead of generic "failed"
- ✅ **Actionable suggestions** for each error
- ✅ **Error codes shown** for debugging
- ✅ **Guest status updated** to "failed" (not "sent")
- ✅ **Activity log records** all errors with details

**User Benefits:**
- 🎯 Know exactly what went wrong
- 🎯 Know how to fix it
- 🎯 No confusion about "sent but not received"
- 🎯 Better debugging with error codes
- 🎯 Can make informed decisions (wait vs use SMS)

---

**Last Updated**: December 11, 2026  
**Version**: 2.0.0 (Enhanced Error Handling)
