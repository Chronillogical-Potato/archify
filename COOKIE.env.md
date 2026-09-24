# Cookie fleet env (archify)

```bash
export ARCHIFY_UPDATE_CHECK_DISABLED=1
# Never set ARCHIFY_BRAND_ALLOW_PRIVATE=1 unless Shem explicitly needs remote brand capture.
```

Bake `ARCHIFY_UPDATE_CHECK_DISABLED=1` into any host wrapper that invokes archify.
