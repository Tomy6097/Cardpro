# WhatsApp Template Manager

## Overview
CardPro now supports **multiple WhatsApp templates** for sending invitations. You can:
- Add multiple templates from Twilio
- Switch between templates easily
- Manage templates from Settings page
- Each template can have different content, images, and buttons

---

## How It Works

### 1. **Template Storage**
Templates are stored in the database (Settings model) with:
- **Name**: Human-friendly name (e.g., "Wedding Invitation V1")
- **Content SID**: Twilio template identifier (e.g., `HX9e7d3b8a1f973c95c208541772e9d9a9`)
- **Description**: Optional notes about the template
- **isActive**: Whether this template is currently selected

### 2. **Template Priority**
System checks for templates in this order:
1. **Selected template from Settings** (database)
2. **TWILIO_CONTENT_SID from .env** (fallback)

### 3. **API Endpoints**
All endpoints require authentication (`protect, adminOnly`):

#### GET `/api/settings/whatsapp-templates`
Get all WhatsApp templates and the currently selected template.

**Response:**
```json
{
  "success": true,
  "templates": [
    {
      "name": "Wedding Invitation V1",
      "contentSid": "HX9e7d3b8a1f973c95c208541772e9d9a9",
      "description": "Classic wedding template with roses",
      "isActive": true,
      "createdAt": "2026-12-11T10:30:00.000Z"
    }
  ],
  "selectedTemplateSid": "HX9e7d3b8a1f973c95c208541772e9d9a9"
}
```

#### POST `/api/settings/whatsapp-templates`
Add a new WhatsApp template.

**Request:**
```json
{
  "name": "Christmas Wedding Template",
  "contentSid": "HX1234567890abcdef",
  "description": "Red and gold theme for December weddings"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Template added successfully.",
  "templates": [...]
}
```

#### PUT `/api/settings/whatsapp-templates/select`
Select/activate a WhatsApp template.

**Request:**
```json
{
  "contentSid": "HX1234567890abcdef"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Template activated successfully.",
  "selectedTemplateSid": "HX1234567890abcdef"
}
```

#### DELETE `/api/settings/whatsapp-templates/:contentSid`
Delete a WhatsApp template.

**Response:**
```json
{
  "success": true,
  "message": "Template deleted successfully.",
  "templates": [...]
}
```

---

## Usage Guide

### Step 1: Create Templates in Twilio
1. Go to Twilio Console → Messaging → Content Template Builder
2. Create your WhatsApp template with:
   - Template name
   - Language
   - Header (image/text)
   - Body with variables
   - Buttons (optional)
3. Submit for Meta approval (1-3 days)
4. Copy the **Content SID** (starts with `HX`)

### Step 2: Add Template to CardPro
1. Go to **Settings → Messaging** tab
2. Scroll to **WhatsApp Template Manager** section
3. Click **"+ Add Template"**
4. Fill in:
   - **Template Name**: e.g., "Christmas Wedding"
   - **Content SID**: Paste from Twilio (e.g., `HX1234...`)
   - **Description**: Optional notes
5. Click **Save**

### Step 3: Select Active Template
1. In the template list, find the template you want to use
2. Click **"Select"** button
3. A green checkmark (✓) shows the active template

### Step 4: Send Invitations
- Go to **Events → [Your Event] → Invitations**
- Select **WhatsApp** channel
- Choose **Template Mode**
- Click **Send** - system will use the selected template!

---

## Template Variables

All templates should use these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{1}}` | Guest Name | "John Doe" |
| `{{2}}` | Client Name (Bride & Groom) | "James & Anna" |
| `{{3}}` | Date & Time | "Ijumaa, 22 Desemba 2026 · Saa 4 Asubuhi" |
| `{{4}}` | Venue | "Golden Tulip Hotel" |
| `{{5}}` | Dress Code | "White and Black" |
| `{{6}}` | Verification Code | "ABCDEF123" |
| `{{7}}` | Confirmation URL (button) | "https://cardpro.app/event/..." |

**Note:** Header image is separate (not a variable).

---

## Frontend API Usage

```javascript
import { settingsAPI } from '../api';

// Get all templates
const { data } = await settingsAPI.getWhatsappTemplates();
console.log(data.templates); // Array of templates
console.log(data.selectedTemplateSid); // Currently active template

// Add new template
await settingsAPI.addWhatsappTemplate({
  name: "New Wedding Template",
  contentSid: "HXabc123...",
  description: "Gold theme"
});

// Select template
await settingsAPI.selectWhatsappTemplate({
  contentSid: "HXabc123..."
});

// Delete template
await settingsAPI.deleteWhatsappTemplate("HXabc123...");
```

---

## Example UI Flow

```
┌─────────────────────────────────────┐
│  WhatsApp Template Manager          │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ✓ Wedding Invitation V1     │   │
│  │ Content SID: HX9e7d...      │   │
│  │ "Classic wedding template"   │   │
│  │ [Selected ✓] [Delete]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   Christmas Wedding         │   │
│  │ Content SID: HX123...       │   │
│  │ "Red and gold theme"        │   │
│  │ [Select] [Delete]           │   │
│  └─────────────────────────────┘   │
│                                     │
│  [+ Add New Template]              │
└─────────────────────────────────────┘
```

---

## Error Handling

### Common Errors:

1. **"This Content SID is already added"**
   - You're trying to add a template that already exists
   - Solution: Check existing templates first

2. **"No WhatsApp template selected"**
   - No template is active and no .env fallback
   - Solution: Select a template or set `TWILIO_CONTENT_SID` in .env

3. **"Template not found"**
   - The Content SID doesn't exist in Twilio
   - Solution: Verify the SID in Twilio Console

4. **Template approval pending**
   - Template exists but Meta hasn't approved it yet
   - Solution: Wait 1-3 days for approval

---

## Migration from Single Template

### Before (Old System):
```env
# .env file
TWILIO_CONTENT_SID=HX9e7d3b8a1f973c95c208541772e9d9a9
```

System always uses this template.

### After (New System):
```env
# .env file (optional fallback)
TWILIO_CONTENT_SID=HX9e7d3b8a1f973c95c208541772e9d9a9
```

**Plus** database templates that override .env:
- Can add multiple templates
- Switch between them in Settings
- No need to edit .env file
- Each event can potentially use different templates (future feature)

---

## Benefits

✅ **Flexibility**: Switch templates without code changes
✅ **Multiple Templates**: Different templates for different occasions
✅ **Easy Management**: Add/remove templates from UI
✅ **Fallback**: Still supports .env for backward compatibility
✅ **Audit Trail**: Activity log tracks template changes
✅ **No Downtime**: Switch templates instantly

---

## Future Enhancements

- [ ] Per-event template selection (each event chooses its template)
- [ ] Template preview in UI
- [ ] Template usage statistics
- [ ] Duplicate template with edits
- [ ] Template testing before approval
- [ ] A/B testing between templates

---

## Troubleshooting

### Template not sending?
1. Check if template is approved in Twilio Console
2. Verify Content SID is correct
3. Check template variables match ({{1}}, {{2}}, etc.)
4. Review Activity Log for errors

### Can't delete template?
- If it's the currently selected template, select another first
- Then delete the old one

### Template not appearing?
- Refresh the page
- Check if you have admin permissions
- Verify database connection

---

**Last Updated**: December 11, 2026
**Author**: CardPro Development Team
