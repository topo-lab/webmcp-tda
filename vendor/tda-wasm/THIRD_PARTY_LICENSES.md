# Third-Party Licenses

The WebAssembly binary distributed with this package
(`dist/persistent_cohomology.wasm`) is compiled from C++ sources that
statically link the libraries below. The package source is licensed MIT (see
LICENSE).

CGAL is no longer used, in any path. The weighted (regular) triangulation comes
from the Geogram Delaunay PSM; the min-enclosing-ball, Čech, bottleneck-distance,
farthest-point-subsampling, weak-witness, Rips-type-ellipsoid,
ellipsoidal-Čech, 2D wing-complex and k-fold-cover computations are original
code in `src/geom/` (MIT, part of this package). The wing complex is a first
public implementation of Weng–Zhao 2026 (CC-BY paper; no reference code is
used). The ellipsoidal Čech complex is written from Giunti–Hill–Ye 2026 (CC-BY
paper); its reference implementation is unlicensed and was not built — see
below.

## GUDHI

- **License:** MIT
- **Version:** 3.11.0 (CI builds against `gudhi.3.11.0.tar.gz`; the maintainer
  toolchain uses the same headers at `/usr/local/include/gudhi`)
- **Source:** https://gudhi.inria.fr/
- **Copyright:** the upstream `LICENSE` file reads
  "Copyright (c) 2014-2019 The GUDHI developers."; the individual headers
  compiled here carry "Copyright (C) 2014 Inria". GUDHI is a project of Inria.
- **Components used:** Simplex tree, Persistent cohomology, Rips complex,
  Bitmap cubical complex, Zigzag persistence, distance functions.
- **Algorithms transcribed (not linked):** the weak witness complex enumeration
  (`Witness_complex.h`, `Witness_complex/all_faces_in.h`,
  `Active_witness/Active_witness.h`) and farthest-point subsampling
  (`choose_n_farthest_points.h`) are reimplemented in `src/geom/`, without
  GUDHI's CGAL-dependent `Euclidean_witness_complex` wrapper. Each
  transcription cites its source header.
- This package is an independent, unofficial WebAssembly build and is not
  affiliated with or endorsed by the GUDHI team.

GUDHI 3.11.0 `LICENSE`, reproduced in full:

```
MIT License

Copyright (c) 2014-2019 The GUDHI developers.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Hera

- **License:** BSD-3-Clause for the selectively vendored components listed
  below. Hera as a whole is GPL-3, but its own `license.txt` grants these
  components an additional BSD-3-Clause license.
- **Pinned commit:** `afeff7fd1a0e16e371060dbda03bd6cec230ecd0`
- **License record:** `third_party/hera/HERA-LICENSE.txt`
- **Components vendored:**
  - common: `include/hera/common.h`, `include/hera/common/`,
    `include/hera/dnn/`
  - bottleneck: `include/hera/bottleneck.h`, `include/hera/bottleneck/`
  - Wasserstein: `include/hera/wasserstein.h`,
    `include/hera/wasserstein_pure_geom.hpp`, `include/hera/wasserstein/`
- **Components used:** Wasserstein auction solver and its common/DNN support.
- **Explicit exclusion:** Hera's GPL-only `matching` code and PHAT are not
  vendored or compiled. The bundled Catch2 test dependency is also excluded.

## Geogram (Delaunay PSM)

- **License:** BSD-3-Clause
- **Source:** https://github.com/BrunoLevy/geogram.psm.Delaunay
- **Copyright:** Bruno Levy
- **Pinned commit:** `0bcf18b30d828a6840cf573220f88d2fdcf18631`
- **License record:** `third_party/geogram_delaunay/LICENSE`
- **Components used:** `RegularWeightedDelaunay3d` / `RegularWeightedDelaunay2d`
  ("BPOW" / "BPOW2d") weighted regular triangulations and the bundled robust
  predicates, backing the weighted alpha complex.

## Not vendored: ellipsoid-complex reference implementations

None of the following ships in the `.wasm`, is redistributed, or is transcribed
into this repo. They are recorded here because they were consulted, because two
of them are run out of tree to generate test-fixture data
(`test/native/gen_ellipsoid_fixture.py`), because one was evaluated for
vendoring and rejected, and because the third could not be used at all — its
licence position is the reason, and recording that is the point.

### t-uda/ellphi — MIT, evaluated for vendoring, NOT vendored

- **License:** MIT (Copyright (c) 2025 Tomoki UDA) — verified against the
  repository's `LICENSE` file
- **Repository:** https://github.com/t-uda/ellphi
- **Evaluated at:** commit `303f7966e1749b5bd36fb0906b68049fb08d6aaa`
  (release 0.1.2); fixture generation uses the PyPI build of the same version
- **What it is:** an n-dimensional ellipse/ellipsoid tangency solver. Its core
  is `src/ellphi/_tangency_cpp_impl.cpp`, ~1200 lines behind a plain C ABI (no
  CPython API), with an optional Eigen path. It solves exactly the quantity our
  pair phase needs.
- **Evaluation.** It is solid. It reaches the same formulation we do — a 1-D
  root-find over the conic pencil with closed-form recovery of the tangency
  radius — and over 120 random 2D/3D pairs it agrees with our independent
  derivation to **5e-15**, i.e. machine precision. Its licence is compatible and
  it is commit-pinnable like Geogram and Hera.
- **Decision: do not vendor.** The reasons are integration cost, not quality:
  1. It is one function of what this builder needs. The ellipsoid fitting, the
     candidate pruning, the certified enclosure, the degenerate-input policy and
     the complex assembly would all still be ours, so vendoring would remove
     roughly 150 lines of arithmetic out of ~700.
  2. Interface mismatch. It takes packed conic coefficient vectors
     (upper-triangular quadratic part, linear part, constant) and returns through
     C-ABI status codes; we hold shape matrices and frames per point. The adapter
     would be comparable in size to the solver we would be avoiding.
  3. It would be the first non-header-only, non-`tdageom` translation unit in
     `src/geom/`, needing its own entry in `scripts/build_ph.sh`, plus its Eigen
     switch and its own error-handling convention, for no numerical gain.
  4. Its iteration policy is tuned for its own callers (algebraic-sigmoid Newton
     with failsafe fallbacks). Our fixtures depend on a *certified* two-sided
     enclosure of the radius, which the concave dual gives us directly and which
     ellphi does not expose.
  5. Keeping it external makes it a better *oracle*: an independent
     implementation we did not write is stronger evidence than the same code
     linked twice. It is the tight numerical pin in `test/native/test_ellipsoid.cpp`
     (1.4e-13 relative over 2232 edges).
- **How it is used:** installed from PyPI into a throwaway virtualenv and called
  from `test/native/gen_ellipsoid_fixture.py` to record `filtration_c` values.
  Not a build, test or runtime dependency of this package.

### a-zeg/ellipsoids — NO LICENCE, oracle data generator only

- **License:** **none.** There is no `LICENSE` file and the GitHub licence API
  returns 404. It therefore carries no grant to copy, modify or redistribute.
- **Repository:** https://github.com/a-zeg/ellipsoids
- **Pinned commit:** `d19c40cea6856c8434ba9fd98e1da5c1d5c0f217`
- **What it is:** the reference implementation accompanying arXiv:2408.11450, the
  paper `src/geom/ellipsoid_complex.hpp` implements.
- **How it is used:** read for understanding, and *run* out of tree to record
  fixture numbers. Algorithms are not copyrightable; our implementation is
  written from the paper, with the paper's propositions cited at each step. No
  line of it is copied, and nothing from it is redistributed here — the recorded
  fixture values are measurements of a computation, not its code.
- **Reproducing the fixtures** needs a local clone at that commit; the steps are
  in the header of `test/native/gen_ellipsoid_fixture.py`. Fixture regeneration
  is a maintainer task, not part of `npm test` or CI.

### shill1729/ellph — NO LICENCE, not built, not consulted for numbers

- **Repository:** https://github.com/shill1729/ellph, the implementation
  referenced by arXiv:2606.01548 for the minimal-intersection-radius computation
  that `src/geom/ellipsoid_cech.hpp` also computes.
- **Licence:** none. No LICENSE file; the GitHub licence API returns 404. Its
  dependency list includes **ALGLIB**, which is GPL/commercial dual-licensed and
  must never be vendored here (NFR-1), plus NLopt (LGPL for some algorithms) and
  Boost/Eigen.
- **Status:** not vendored, not linked, not transcribed, and — unlike
  `a-zeg/ellipsoids` — **not even built or run out of tree**. It contributes no
  number to any fixture or test. `src/geom/ellipsoid_cech.hpp` was written from
  the paper (Sections 2.1 and 2.3: the dual function of Eq. 1, the certificate of
  Eq. 4, Lemmas 2.8-2.11, Theorems 2.12-2.13 and 2.17, Proposition 2.18).
- **What we used as external checks instead**, precisely because the reference
  code is not usable: the paper's own *printed* Section 2.4 counterexample
  (three named ellipses in R^2 with a stated MIR of "approximately 4.87"), which
  is reproduced to 4.870561397481; the reduction to Welzl minimum enclosing balls
  in the isotropic limit, against code already oracled in this repo; and an
  independent primal verifier written for the purpose in
  `test/native/test_ellipsoid_cech.cpp`. A published number in a CC-BY paper
  carries no licence obligation on the code that reproduces it.
- The paper itself is CC BY 4.0, so quoting its statements and constants in
  comments and tests is fine with attribution, which is given at every use.

## Boost

- **License:** Boost Software License 1.0 (BSL-1.0)
- **Source:** https://www.boost.org/
- **Components used:** header-only utilities via GUDHI.

## Eigen — include path only, NOT compiled in

- **License:** Mozilla Public License 2.0 (MPL-2.0)
- **Source:** https://eigen.tuxfamily.org/
- **Status:** `scripts/build_ph.sh` still passes `-I$EIGEN_INCLUDE_DIR` when it
  finds Eigen, but no translation unit in this package includes an Eigen
  header (`grep -rn Eigen src/` finds nothing), and no Eigen code reaches the
  shipped `.wasm`. It is listed here only so the include path is not mistaken
  for an undeclared dependency. Eigen is not required to build this package.

## rhomboidtiling — test-fixture generator only, NOT distributed

- **License:** MIT (but CGAL-bound, so GPL/LGPL at link time)
- **Source:** https://github.com/geoo89/rhomboidtiling
- **Status:** Not vendored, not linked, not transcribed. The reference
  implementation of Corbet–Kerber–Lesnick–Osang's rhomboid bifiltration is used
  by `test/native/gen_kfold_fixture.py` as an out-of-tree ORACLE GENERATOR to
  produce `test/native/kfold_fixture.txt`. Building it requires CGAL, which is
  why it stays out of this repository entirely;
  `src/geom/kfold_cover.hpp` was written from the published papers
  (Edelsbrunner–Osang, SoCG 2018 and arXiv:2011.03617), not from its source.
  Only the generated numerical data is committed here, and data produced by a
  program is not a derivative work of that program.

## Emscripten

- **License:** MIT
- **Version:** 4.0.15 (CI and the maintainer toolchain)
- **Source:** https://emscripten.org/
- **Used for:** Compiling the C++ sources to WebAssembly; portions of the
  Emscripten runtime are embedded in the generated `.mjs` loader.

### Emscripten runtime libraries linked into the shipped binary

Emscripten links its own C and C++ runtime into every binary it produces.
These are not dependencies this package chooses or vendors, but they are
present in the distributed `dist/persistent_cohomology.wasm` and
`dist/persistent_cohomology.mjs`, so they are listed here:

- **musl libc** — MIT. Emscripten's C standard library, derived from musl.
  Source: https://musl.libc.org/ and `emscripten/system/lib/libc/musl`.
- **libc++** — Apache-2.0 WITH LLVM-exception. The C++ standard library;
  `std::vector`, `std::map`, `std::sort` and friends used throughout this
  package resolve into it.
- **libc++abi** — Apache-2.0 WITH LLVM-exception. C++ ABI support, including
  the exception machinery behind the `-fwasm-exceptions` build.
- **compiler-rt** — Apache-2.0 WITH LLVM-exception. Compiler builtins.

The LLVM exception to Apache-2.0 exists precisely to allow static linking into
a differently-licensed binary without imposing attribution on the binary's
users. All four are permissive and compatible with this package's MIT license.
Full texts ship with the Emscripten SDK
(`emsdk/upstream/emscripten/LICENSE`, and the LLVM `LICENSE.TXT`).
