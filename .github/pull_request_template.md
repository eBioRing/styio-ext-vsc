## Summary

-

## Release Impact

- [ ] No Marketplace/runtime impact
- [ ] Changes VSIX contents
- [ ] Changes LSP startup or `styio_lspd` discovery
- [ ] Changes release workflow or publish gates

## Verification

- [ ] `npm run check`
- [ ] `npm run release:preflight`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:lsp-wire`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:e2e`
- [ ] `npm run package:vsix`
- [ ] `STYIO_LSPD_PATH=<path> npm run test:smoke`

## Notes

-
