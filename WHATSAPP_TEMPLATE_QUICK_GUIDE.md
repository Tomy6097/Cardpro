# WhatsApp Template Manager - Quick Guide

## ✅ NIMESHA-IMPLEMENT:

### 1. **Backend API** (✓ Done & Pushed to GitHub)
- **Model**: `Settings.js` - Added `whatsappTemplates` array na `selectedWhatsappTemplateSid`
- **Controller**: `settingsController.js` - 4 new endpoints:
  - `GET /api/settings/whatsapp-templates` - Get all templates
  - `POST /api/settings/whatsapp-templates` - Add template
  - `PUT /api/settings/whatsapp-templates/select` - Select active template
  - `DELETE /api/settings/whatsapp-templates/:contentSid` - Delete template
- **Routes**: `settings.js` - Added routes for template management
- **Invitation Logic**: `invitationController.js` - Updated to use selected template

### 2. **Frontend API** (✓ Done & Pushed to GitHub)
- **API Functions**: `client/src/api/index.js` - Added:
  - `settingsAPI.getWhatsappTemplates()`
  - `settingsAPI.addWhatsappTemplate(data)`
  - `settingsAPI.selectWhatsappTemplate(data)`
  - `settingsAPI.deleteWhatsappTemplate(contentSid)`

### 3. **Documentation** (✓ Done)
- `WHATSAPP_TEMPLATE_MANAGER_GUIDE.md` - Comprehensive guide
- `WHATSAPP_TEMPLATE_QUICK_GUIDE.md` - This file (quick reference)

---

## 📋 JINSI YA KUTUMIA:

### **Option 1: Kwa sasa (Using .env - Single Template)**
```env
# server/.env
TWILIO_CONTENT_SID=HX9e7d3b8a1f973c95c208541772e9d9a9
```
System itatumia hii template by default.

### **Option 2: Baadaye (Using Database - Multiple Templates)**

#### Step 1: Tengeneza template kwenye Twilio
1. Go to Twilio Console → Messaging → Content Templates
2. Create template with name, variables, image, button
3. Submit for approval
4. Copy **Content SID** (e.g., `HXabc123...`)

#### Step 2: Add template kwenye system
**Backend already ready!** Sasa unahitaji tu UI kwenye Settings page.

Unaweza test API hivi using Postman/Thunder Client:

```bash
# Add template
POST http://localhost:5000/api/settings/whatsapp-templates
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "Christmas Wedding Template",
  "contentSid": "HX1234567890abcdef",
  "description": "Red and gold theme"
}

# Select template
PUT http://localhost:5000/api/settings/whatsapp-templates/select
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "contentSid": "HX1234567890abcdef"
}

# Get all templates
GET http://localhost:5000/api/settings/whatsapp-templates
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🎯 JINSI SYSTEM INACHAGUA TEMPLATE:

```
1. Check Settings.selectedWhatsappTemplateSid (database)
   ↓ If not found
2. Check process.env.TWILIO_CONTENT_SID (.env file)
   ↓ If not found
3. Error: "No WhatsApp template selected"
```

---

## 📱 FRONTEND UI (TODO - Optional)

Nikufanyie UI kwenye Settings page? Itakuwa ina:
- List ya templates zote
- Button ya "Add New Template"
- Button ya "Select" (activate template)
- Button ya "Delete"
- Show which template is currently active (green checkmark ✓)

**Ama unaweza manage templates kwa API direct for now?**

---

## 💡 EXAMPLE: Adding 2nd Template

### Scenario:
Una template mbili:
1. **Wedding Classic** - `HX9e7d3b8a1f973c95c208541772e9d9a9` (iliyopo sasa)
2. **Wedding Modern** - `HXnew123456789` (mpya)

### Steps:
```javascript
// 1. Add 2nd template
await settingsAPI.addWhatsappTemplate({
  name: "Wedding Modern",
  contentSid: "HXnew123456789",
  description: "Modern minimalist design"
});

// 2. Switch to new template
await settingsAPI.selectWhatsappTemplate({
  contentSid: "HXnew123456789"
});

// 3. Now all invitations use "Wedding Modern" template!
```

---

## 🚀 DEPLOYMENT STATUS:

✅ **Backend changes pushed to GitHub** (commit: 150436d)
⏳ **Render will auto-deploy** (~3-5 minutes)
❌ **Frontend UI not yet implemented** (optional - can use API directly)

---

## ❓ NEXT STEPS:

**Je, unataka:**
1. ✅ **Niendelee na UI kwenye Settings page?** (Highly recommended)
   - Easy to manage templates
   - Visual interface
   - No API calls needed
   
2. ⚡ **Tutumie API direct kwa sasa?** (Quick solution)
   - Use Postman/Thunder Client
   - Good for testing
   - Can add UI later

**Jibu tu: "1" au "2"** 😊

---

## 📞 SUPPORT:

- Full docs: `WHATSAPP_TEMPLATE_MANAGER_GUIDE.md`
- Error handling: All endpoints have detailed error messages
- Activity logging: All template changes logged in Activity Log

**Current Status**: Backend ✓ | Frontend UI ⏳ | Docs ✓
