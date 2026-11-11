# Demo walkthrough (about 5 minutes)

Runs in demo mode, so no Supabase project is needed.

```bash
npm install
npm run dev
```

1. **Sign in.** Open the local URL and press **Try the demo**. (With Supabase
   configured, this screen asks for an email and sends a magic link instead.)
2. **Library.** Six made-up cards. Each shows its verdict and status:
   - _Moonlit Orchard_: **Yes** (pear, bergamot, jasmine, sandalwood, musk).
   - _Velvet Library_: **No** (aldehydes, iris, powdery).
   - _Sunday Caramel_: lounge cues (caramel, praline, vanilla) never count against it.
   - _Ember Road_: oud leads, so the lead-only flag counts.
   - _Mystery Bottle No. 7_: no notes, so **Mystery**.

   Try the search box (“pear”) and the verdict / status / Armor-Lounge filters.

3. **Open a card.** The “Is this for me?” panel shows the verdict, one sentence
   of reason, and the matching notes as chips (likes, flags, dislikes, lounge
   cues, and any lead-only flag that was ignored because it didn’t lead). Below:
   notes, details, the bid limit from the retail price, and dupe links
   (_Orchard Echo_ is a dupe of _Moonlit Orchard_).
4. **Add a scent** (+ tab). As you type notes, the verdict preview updates live.
   Add a photo from your camera roll; it is resized before saving. Save.
5. **Edit / delete.** Change the status or notes, then delete the card. Its dupe
   links are removed with it.
6. **My taste.** Edit likes, dislikes, flags, lead-only flags and lounge cues.
   Add `saffron` to likes, save, and _Ember Road_ moves from **No** to
   **Leaning no** (−2 for the leading oud, +1 for saffron). “Load example
   profile” restores the starter rules.
7. **Dupes.** Link two cards as _Dupe of_, _Has DNA of_ or _Inspired by_; remove a link.
8. **Bids.** Type `100` → max bid $55, max total $60. Tick **Mystery bottle** →
   capped at $10. Type `8` → skip. Unowned cards with a price are listed with
   their max bid.
9. **Install.** `npm run build && npm run preview`, open it on a phone on the
   same network (or deploy to Pages), then Safari → Share → Add to Home Screen.
10. **Reset.** My taste → **Reset demo** wipes the demo data from the browser.
