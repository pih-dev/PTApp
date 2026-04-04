"""Generate CATALOG.pdf with embedded screenshots from CATALOG.md structure."""
import os
from fpdf import FPDF
from PIL import Image

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Screenshots in chronological order, grouped by catalog section
SECTIONS = [
    {
        "title": "v1.x -First Day (Apr 1, 2026)",
        "desc": "Red accent, 4 stat cards, Confirm button, no focus tags, old logo.",
        "images": [
            ("v1x-dark-home-red-accent-apr01.jpg", "Home tab, dark theme, red accent, old logo"),
            ("v1x-dark-schedule-red-accent-apr01.jpg", "Schedule tab, red accent, no focus tags"),
            ("whatsapp-pt-reaction-apr01.jpg", 'PT reaction: "This is awesome", "Its gonna make us money"'),
        ],
    },
    {
        "title": "v2.2 -Red vs Blue Era (Apr 3, 2026)",
        "desc": "Red accent in dark, blue in light. Outline badges, no shadows, vertical logo.",
        "images": [
            ("v2.2-dark-red-accent-apr03.jpg", "Dark theme, v2.2, red accent, outline badges"),
            ("v2.2-light-warm-beige-apr03.jpg", "Light theme, v2.2, warm beige, cards blend in"),
        ],
    },
    {
        "title": "v2.3 to v2.4 Comparison (Apr 3, 2026)",
        "desc": "Pierre's side-by-side collages showing the transition.",
        "images": [
            ("v2.3-vs-v2.4-dark-collage-apr03.jpg", "Dark: v2.3 (left) vs v2.4 (right)"),
            ("v2.3-vs-v2.4-light-collage-apr03.jpg", "Light: v2.3 (left) vs v2.4 (right)"),
        ],
    },
    {
        "title": "v2.4 -Blue Strips on Beige (Apr 3, 2026 ~11:16am)",
        "desc": "Blue glass header/nav on beige background. 'Presentable' but beige was weak.",
        "images": [
            ("v2.4-light-beige-bg-blue-strips-apr03.jpg", "Light: blue strips on beige background"),
            ("v2.4-dark-blue-header-apr03.jpg", "Dark: blue-tinted header, nav still near-black"),
        ],
    },
    {
        "title": "v2.4 -Blue Glass Refinement (Apr 3, 2026 ~11:23am)",
        "desc": "Refined blue glass treatment.",
        "images": [
            ("v2.4-dark-blue-header-refined-apr03.jpg", "Dark: refined blue-tinted header"),
            ("v2.4-light-blue-glass-header-apr03.jpg", "Light: cleaner blue glass header/nav"),
        ],
    },
    {
        "title": 'v2.4 -Final State (Apr 3, 2026 ~11:30am)',
        "desc": 'Pierre: "amazing stuff, perfect"',
        "images": [
            ("v2.4-final-dark-apr03.jpg", "Dark: blue glass cohesion top-to-bottom"),
            ("v2.4-final-light-apr03.jpg", "Light: blue-toned bg, soft blue cards, coherent"),
        ],
    },
    {
        "title": "v2.4 -Deep Blue Canvas (Apr 4, 2026 ~6:35am)",
        "desc": "First round: deepened light theme, too monotone.",
        "images": [
            ("v2.4-light-deep-blue-before.jpg", "Light: deep blue canvas, cards don't separate"),
            ("v2.4-dark-deep-blue-before.jpg", "Dark: nav buttons barely readable (0.55 opacity)"),
        ],
    },
    {
        "title": "v2.4 -Contrast Fix + Nav Readability (Apr 4, 2026 ~6:43am)",
        "desc": "Background lighter, cards opaque, dark nav active still too pale.",
        "images": [
            ("v2.4-light-contrast-fix.jpg", "Light: contrast fix, opaque white-blue cards"),
            ("v2.4-dark-nav-fix.jpg", "Dark: nav buttons brighter, active #60A5FA (too pale)"),
        ],
    },
    {
        "title": "v2.4 -Dark Nav Final (Apr 4, 2026 ~6:51am)",
        "desc": 'Active #3B82F6 (blue-500). Pierre: "Perfect."',
        "images": [
            ("v2.4-dark-nav-final-apr04.jpg", "Dark: final nav -#3B82F6 active, 0.75 inactive"),
        ],
    },
    {
        "title": "v2.4 -Glossy Nav + Text Contrast (Apr 4, 2026 ~7:40am)",
        "desc": "Glossier glass, solid stat cards, stronger muted text, toggle visibility.",
        "images": [
            ("v2.4-light-glossy-contrast-apr04.jpg", "Light: glossier nav, solid stats, darker text (Android)"),
        ],
    },
    {
        "title": "v2.4 -Contrast + Nav Before/After (Apr 4, ~6:35-6:44am, iPhone)",
        "desc": "Before and after the glossy nav + text contrast pass, from PT's iPhone.",
        "images": [
            ("v2.4-iphone-light-before-contrast-apr04.jpg", "Light BEFORE: faded stat cards, light text, glass less defined"),
            ("v2.4-iphone-light-after-contrast-apr04.jpg", "Light AFTER: punchier stats, darker text, frosted glass"),
            ("v2.4-iphone-dark-before-nav-apr04.jpg", "Dark BEFORE: dim nav labels (0.55 opacity)"),
            ("v2.4-iphone-dark-after-nav-apr04.jpg", "Dark AFTER: brighter nav (0.75 opacity), visible active tab"),
        ],
    },
    {
        "title": "v2.4 -Expanded Dashboard + Focus Tags (Apr 4, ~9:19am, iPhone)",
        "desc": "Dashboard expanded view with focus tags and notes on session cards.",
        "images": [
            ("v2.4-iphone-dark-expanded-focus-apr04.jpg", "Dark: Pierre #3 + Danny #2, focus tags, Notes field"),
            ("v2.4-iphone-light-expanded-dashboard-apr04.jpg", "Light: same view on blue canvas, frosted glass"),
            ("v2.4-iphone-dark-expanded-dashboard-apr04.jpg", "Dark: expanded sessions with type-colored borders"),
            ("v2.4-iphone-light-glossy-overview-apr04.jpg", "Light: overview, stat cards 8/4/4, Violette session"),
        ],
    },
    {
        "title": "v2.4 -Client History Editable (Apr 4, ~9:39am, Android)",
        "desc": "Clients tab expanded: session history with editable focus tags + notes.",
        "images": [
            ("v2.4-dark-client-history-editable-apr04.jpg", "Pierre's client card expanded, Apr 2026: 2 Completed + 1 Scheduled, focus tags + notes inline"),
        ],
    },
    {
        "title": "v2.4 -Billing Period Form (Apr 4, ~10:52am, Android)",
        "desc": "New per-client billing period fields in Edit Client modal.",
        "images": [
            ("v2.4-dark-period-fields-apr04.jpg", "Edit Client form: Period Start (empty) + Period Length (Default)"),
            ("v2.4-dark-period-datepicker-apr04.jpg", "Android date picker for Period Start, April 2026"),
            ("v2.4-dark-period-length-dropdown-apr04.jpg", "Period Length options: Default, 1 Month, 4 Weeks, 2 Weeks, 1 Week"),
        ],
    },
]


class CatalogPDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(120, 120, 140)
        self.cell(0, 8, "PTApp Screenshot Catalog", align="C")
        self.ln(10)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def add_image_fitted(pdf, path, caption, max_w, max_h):
    """Add an image scaled to fit within max_w x max_h, centered, with caption."""
    if not os.path.exists(path):
        pdf.set_font("Helvetica", "I", 10)
        pdf.set_text_color(200, 80, 80)
        pdf.cell(max_w, 10, f"[missing: {os.path.basename(path)}]", align="C")
        pdf.ln(12)
        return

    img = Image.open(path)
    iw, ih = img.size
    ratio = min(max_w / iw, max_h / ih)
    w = iw * ratio
    h = ih * ratio

    # Check if we need a new page (leave room for image + caption)
    if pdf.get_y() + h + 12 > pdf.h - 25:
        pdf.add_page()

    x = (pdf.w - w) / 2
    pdf.image(path, x=x, y=pdf.get_y(), w=w, h=h)
    pdf.set_y(pdf.get_y() + h + 2)

    # Caption
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 100, 120)
    pdf.multi_cell(0, 4, caption, align="C")
    pdf.ln(4)


def main():
    pdf = CatalogPDF("P", "mm", "A4")
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=20)

    # Title page
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 28)
    pdf.set_text_color(30, 27, 75)
    pdf.ln(60)
    pdf.cell(0, 15, "PTApp", align="C")
    pdf.ln(12)
    pdf.set_font("Helvetica", "", 14)
    pdf.set_text_color(80, 80, 100)
    pdf.cell(0, 10, "Screenshot Catalog", align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 11)
    pdf.cell(0, 8, "Visual evolution from v1.x to v2.4", align="C")
    pdf.ln(16)
    pdf.set_font("Helvetica", "I", 10)
    pdf.set_text_color(120, 120, 140)
    pdf.cell(0, 8, "Generated Apr 4, 2026 -Samsung S25 Ultra + iPhone screenshots", align="C")

    # Content sections
    for section in SECTIONS:
        pdf.add_page()
        # Section title
        pdf.set_font("Helvetica", "B", 16)
        pdf.set_text_color(30, 27, 75)
        pdf.multi_cell(0, 8, section["title"])
        pdf.ln(2)

        # Section description
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(80, 80, 100)
        pdf.multi_cell(0, 5, section["desc"])
        pdf.ln(6)

        # Images -phone screenshots are tall, so fit 1 per page width
        # Use narrower width to keep them proportional (phone aspect ratio)
        page_w = pdf.w - 40  # margins
        max_img_h = pdf.h - pdf.get_y() - 30  # remaining space

        for filename, caption in section["images"]:
            path = os.path.join(SCRIPT_DIR, filename)
            add_image_fitted(pdf, path, caption, min(page_w, 90), min(max_img_h, 200))

    output_path = os.path.join(SCRIPT_DIR, "CATALOG.pdf")
    pdf.output(output_path)
    print(f"PDF saved: {output_path}")
    print(f"Pages: {pdf.page_no()}")


if __name__ == "__main__":
    main()
