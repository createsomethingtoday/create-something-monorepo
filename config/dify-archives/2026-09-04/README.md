# Dify HUB archive — 2026-09-04

These files are the exact DSL exports retained before the matching Dify Studio
apps were deleted under CRE-1934. They are historical recovery artifacts, not
the active-agent source of truth in `config/dify-agents/` or
`config/dify/inventory.json`.

| Dify app | Retained DSL | SHA-256 |
| --- | --- | --- |
| AARON HUB | `aaron-hub.dify.yml` | `21069c64df92ff0624276d7cc25a641a1c174d1e9a913fe2516bf1883f2d8f7d` |
| AUGUST HUB | `august-hub.dify.yml` | `a1b84deee8d59ffccb532a6bb2f4b1dedbece5245ce684ef9fdddaf9ee151399` |
| BLOND:ISH HUB | `blondish-hub.dify.yml` | `f4bb93cf1f191a27676aeef776f2a27105de326de804b94c211ce034254d9eea` |
| C3 HUB | `c3-hub.dify.yml` | `56a6b6cb88628e3fe7dd6483ab92759d7f911fc702eae995ef7403626b559dd2` |
| CRACKED HUB | `cracked-hub.dify.yml` | `e4d72c1cb7c498ca56cb2f737699280cfd14446b1616759b4dfdd795cc5082c9` |
| DANNY HUB | `danny-hub.dify.yml` | `0a2c8414a00a9c5e0e8bdc67b6482dafb8e58d88862d20b83ee2227b81584737` |
| FILLIP HUB | `fillip-hub.dify.yml` | `75c1e3281a08ed23d0891f51db36ccc447a3b290e8fc13338c5f56e16d8f7d01` |
| LAINY HUB | `lainy-hub.dify.yml` | `f2f6be3fcf14bebd3e6f4e3146156c81f88b88a602e08ea4810ac901a6259fd0` |
| LEAH HUB | `leah-hub.dify.yml` | `410fc755e9d61d85298264b8cac700a865502a7f4d9634d25f79aa711b0e693f` |
| MJ HUB | `mj-hub.dify.yml` | `5b38bef9c17cd8834c019615778b862629cb21ae6058ca988661e70f3e48d936` |
| MORGAN HUB | `morgan-hub.dify.yml` | `ebad81d8f3af2a98db8d97ecc941ddc03309acb091f0d4b1d97f9dbb72eb8de2` |
| NATALIA HUB | `natalia-hub.dify.yml` | `6d92614a556fbf776ad56b8761453d0b64b0252139315235b1731fbb590f5735` |
| VICKI HUB | `vicki-hub.dify.yml` | `d5e31cb80e5b2cf520f9ff46bc043a2b9d98342a17a589c875c07e348c52e871` |
| VIV HUB | `viv-hub.dify.yml` | `7310211fd6abaf84241d1c2dbffaf42edc3a6e1f7b3b719d132715d7656b4d59` |

Restore by importing the required `.dify.yml` file into Dify Studio. A restore
does not reactivate external MCP credentials or recreate service API keys;
those must follow the current governed provisioning workflow.
