# Target site (Role 1 owns this folder)

Clone A11yGoat or bada11y into this folder, e.g.:

```bash
git clone https://github.com/pope-mike/A11yGoat.git .
```

Serve it locally:

```bash
python -m http.server 8000
```

Confirm both scanners return real violations against it before anyone
else builds on top of this folder:

```bash
npx pa11y http://localhost:8000
npx axe http://localhost:8000
```
