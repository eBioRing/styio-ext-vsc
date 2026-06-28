# Security Policy

## Supported Versions

Security fixes are accepted for the latest published Styio Language Support
version and the active `nightly` development branch.

## Reporting A Vulnerability

Please do not open public issues for vulnerabilities.

Report security concerns through the repository security advisory flow when
available, or contact the publisher privately before disclosure. Include:

- Styio Language Support version
- VS Code version and operating system
- how `styio_lspd` is discovered (`styio.server.path`, `STYIO_LSPD_PATH`,
  `STYIO_NIGHTLY_ROOT`, or `PATH`)
- minimal reproduction steps
- whether the issue requires opening an untrusted Styio workspace

## Runtime Boundary

The extension does not collect telemetry and does not contact remote services.
It starts a local `styio_lspd` process and communicates over stdio. Treat the
configured language-server binary as trusted local developer tooling.
