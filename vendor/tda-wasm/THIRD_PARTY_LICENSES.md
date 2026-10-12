# Third-Party Licenses

The WebAssembly binary distributed with this package (`dist/tda.wasm`,
exported as `@topolab/tda-wasm/tda.wasm`) is compiled from this package's own
C++ (`src/persistent_cohomology.cpp`, `src/geom/`), the vendored Geogram
Delaunay PSM (below) and the Rust crates in `rust/`: `rust/tda-core` and
`rust/tda-core-c`, this package's own code, and `rust/ot-diagram`, the
diagram-distance code of ot-wasm's `ot-core` (Topolab's own) copied verbatim,
whose network simplex pivot is derived from LEMON (see "LEMON" and "Rust
core" below); with Emscripten's runtime libraries and the Rust standard
library. Nothing else is linked or included: no GUDHI, Boost, Eigen or CGAL
header is compiled (GUDHI and Boost since 2026-10-05; `scripts/build_ph.sh`
lists every header the preprocessor reaches and stops on any under `gudhi/` or
`boost/`). One file of `src/geom/` carries code derived from GUDHI:
`src/geom/sampling.hpp`, an edited port of GUDHI 3.11.0's
`choose_n_farthest_points` (MIT; see "GUDHI" below). The package source is
licensed MIT (see LICENSE). The optional commutative-ladder engine is a second
binary, `dist/ladder/`.

No CGAL header is compiled, in any path (two pieces of the Geogram PSM come
from CGAL code; see "Geogram"), and since 2026-10-05 GUDHI is not compiled
(see below). The weighted (regular) triangulation comes
from the Geogram Delaunay PSM; the min-enclosing-ball, Čech,
farthest-point-subsampling, weak-witness, Rips-type-ellipsoid,
ellipsoidal-Čech, 2D wing-complex and k-fold-cover computations are code in
`src/geom/` (MIT, part of this package), written for this package except the
farthest-point subsampling, which is the GUDHI port named above; the Čech
value rule and the witness complex's face check follow designs of GUDHI's
(see "GUDHI"). The wing complex is written from Weng–Zhao 2026 (CC-BY paper);
the authors' code was in an unreleased fork as of 2026-08-31, and no
reference code is used. The ellipsoidal Čech complex is written from
Giunti–Hill–Ye 2026 (CC-BY paper); its reference implementation is
unlicensed and was not built — see below.

## GUDHI — one ported file; otherwise a test oracle (not compiled since 2026-10-05)

- **License:** MIT ("Copyright (c) 2014-2019 The GUDHI developers"; each
  header carries an Inria line such as "Copyright (C) 2016 Inria"). GUDHI is
  a project of Inria.
- **Source:** https://gudhi.inria.fr/
- **Shipped code derived from GUDHI:** `src/geom/sampling.hpp` (in the npm
  package and compiled into `dist/tda.wasm`), whose
  `choose_n_farthest_points` is an edited port of GUDHI 3.11.0's
  `include/gudhi/choose_n_farthest_points.h` (Siargey Kachanovich and Marc
  Glisse, "Copyright (C) 2016 Inria"): the same `dist_to_L` and
  `final_size`, the same opening sequence and the same swap-remove table of
  the points not chosen yet. Since 2026-10-05 an exact tie goes to the
  smallest index, and the distance update and the search for the farthest
  point are one pass over coordinates kept per axis. The file carries GUDHI's
  notice; the licence text is reproduced below. No other shipped file is
  ported from GUDHI; the designs of GUDHI's that shipped code follows are
  listed next.
- **Designs followed, code written here:** the value rule of the Čech and
  Delaunay–Čech builders (`src/geom/cech_complex.hpp`, `detail_cech`) is the
  rule of GUDHI's `assign_MEB_filtration` (`include/gudhi/MEB_filtration.h`):
  a simplex takes the enclosing ball of the first facet whose ball contains
  the omitted vertex, else computes its own; here on this package's own
  enclosing-ball code. The weak witness enumeration
  (`src/geom/witness_complex.hpp`) is written from the definitions, and its
  `facets_present` keeps the design of GUDHI's `all_faces_in` (every facet
  looked up, the largest facet value kept); it yields the same simplices and
  values as the transcription it replaced, emitted in another order.
- **Until 2026-10-05** the module compiled GUDHI 3.11.0's simplex tree,
  persistent cohomology, bitmap cubical complex and zigzag persistence (and,
  before the flat API of the same day, its Rips complex and distance
  functions), with the Boost headers they include. `src/geom/` carried
  transcriptions of its weak witness enumeration (`Witness_complex.h`,
  `all_faces_in.h`, `Active_witness*.h`), farthest-point subsampling
  (`choose_n_farthest_points.h`) and the dimension-0 union-find of
  `Persistent_cohomology.h`, and `rust/tda-core/src/complex/cubical.rs` a
  transcription of the lower-star propagation of
  `Bitmap_cubical_complex_base.h` (`impose_lower_star_filtration`).
- **Since then** the builders hand their complexes to the Rust core
  (`rust/tda-core/src/complex/`), persistence of every complex, cubical grid
  and raw pair export is this package's reducer
  (`src/geom/twist_persistence.hpp`, since 2026-10-11 its Rust port
  `rust/tda-core/src/persistence`), zigzag is the FastZigzag conversion
  (`src/geom/zigzag_fast.hpp`, since 2026-10-11 its Rust port
  `rust/tda-core/src/zigzag.rs`; the two C++ files are kept in `test/native/`
  as test oracles and are not in the module), the witness enumeration and the dimension-0
  union-find are written from their definitions, and the cubical lower-star
  transcription was deleted (2026-10-05; a cell's value is now the minimum of
  its top cells in the IEEE total order). Farthest-point subsampling is the
  edited port above.
  Conventions kept for compatibility are not code: the bitmap numbering of
  cubical cells and Rips distances summed in GUDHI's operand order. Two more
  were dropped in 0.3.0: the weighted alpha and Delaunay–Čech complexes are
  listed in the documented order instead of the simplex tree's, and the
  coefficient fields go past `Field_Zp`'s limit of 46337 to any prime up to
  2^31 − 1, refused with this package's own messages.
- **Development-time use, not distributed:** Python gudhi 3.12.0 in the
  fixture generators, oracle checks and benchmarks (`scripts/`, `benchmarks/`);
  GUDHI 3.11.0's C++ headers in three native tests
  (`test/native/test_tree_persistence.cpp`, `test_alpha_persistence.cpp`,
  `test_cubical_axes.cpp`), which skip where they are not installed, as in CI.
  The other repository file derived from GUDHI code, the frozen witness
  reference `test/native/witness_reference.hpp` (the pre-rewrite builder that
  `test/native/test_witness_fast.cpp` compares against), carries GUDHI's MIT
  notice itself and is not in the npm package.
- **Boost** (BSL-1.0) came in with GUDHI's headers and left with them; the
  dispatch-only CI job that builds the external rhomboidtiling oracle still
  installs it, outside the package. **Eigen** (MPL-2.0) was on the include
  path without any header being included; it is no longer looked for.
- This package is independent of the GUDHI project and is not affiliated with
  or endorsed by the GUDHI team.

GUDHI 3.11.0 `LICENSE`, reproduced in full (it applies to the port in
`src/geom/sampling.hpp`, whose source header carries "Copyright (C) 2016
Inria"):

```text
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

## Geogram (Delaunay PSM)

- **License:** BSD-3-Clause
- **Source:** https://github.com/BrunoLevy/geogram.psm.Delaunay
- **Copyright:** the compiled sources (`Delaunay_psm.cpp`, `Delaunay_psm.h`)
  carry "Copyright (c) 2000-2022 Inria" with a non-endorsement clause naming
  the ALICE Project-Team, reproduced below; the PSM repository's `LICENSE`
  file reads "Copyright (c) 2022, Bruno Levy".
- **Pinned commit:** `0bcf18b30d828a6840cf573220f88d2fdcf18631`
- **License record:** `third_party/geogram_delaunay/LICENSE` (the PSM
  repository's licence file) and the notice below (the one in the compiled
  sources). Both ship with the npm package and the release bundle, as BSD-3
  requires for the binary.
- **Components used:** `RegularWeightedDelaunay3d` / `RegularWeightedDelaunay2d`
  ("BPOW" / "BPOW2d") weighted regular triangulations and the bundled robust
  predicates, backing the weighted alpha complex.
- **Local modifications:** three, marked `tda-wasm patch` and listed in
  `third_party/geogram_delaunay/README.md`: two in the random-number helpers
  (`GEO::random_shuffle` seeds one engine per thread once;
  `GEO::Numeric::random_reset()` copies a pristine engine state), and the
  removal of the `EM_ASM` block in `GEO::initialize()` written to mount the
  host's working and root directories (NODEFS) under node.js (issue #21).
- **Code from CGAL:** two pieces of the PSM come from CGAL code whose
  copyright holder, Inria, is also Geogram's; the PSM carries them under the
  BSD-3 notice below.
  - `in_sphere_3d_filter_optim` (`Delaunay_psm.cpp`, lines 19598–19672) is
    the static filter of CGAL's `Side_of_oriented_sphere_3`, with the same
    error bound and the same underflow and overflow guards. Upstream
    Geogram's `predicates.cpp` says it "was optimized by hand by Sylvain
    Pion"; the PSM leaves that comment out. It is compiled in, but no path of
    the module calls it: the 3D weighted triangulation ("BPOW") decides with
    `orient_3dlifted_SOS`, and the k-fold cover's exact fallback with
    `side4_3d`. Only the native test oracle
    `kfold_cover_complex_3d_brute_force` reaches it, through
    `in_sphere_3d_SOS`.
  - `HilbertSort3d` follows CGAL's `Hilbert_sort_median_3` (the same
    recursive median split). Geogram credits it, and `HilbertSort2d`, with
    "The implementation of spatial sort is inspired by the use of
    std::nth_element() and the recursive template in the spatial sort package
    of CGAL". The weighted alpha complex uses both: Geogram puts the points in
    BRIO order with them before inserting.

The notice at the head of `Delaunay_psm.cpp` and `Delaunay_psm.h`:

```text
Copyright (c) 2000-2022 Inria
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice,
this list of conditions and the following disclaimer in the documentation
and/or other materials provided with the distribution.
* Neither the name of the ALICE Project-Team nor the names of its
contributors may be used to endorse or promote products derived from this
software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.

Contact: Bruno Levy

   https://www.inria.fr/fr/bruno-levy

   Inria,
   Domaine de Voluceau,
   78150 Le Chesnay - Rocquencourt
   FRANCE
```


## LEMON — the network simplex pivot of the diagram distances (Boost Software License 1.0)

Source: LEMON 1.3.1, `lemon/network_simplex.h`, class `NetworkSimplex`
(<https://lemon.cs.elte.hu/>). The network simplex in
`rust/ot-diagram/src/emd.rs`, behind `diagramWasserstein`, is a verbatim copy
of ot-wasm's `crates/ot-core/src/emd.rs` (Topolab's own; commit `24b6ee2`,
recorded with the SHA-256 of every copied file in
`rust/ot-diagram/UPSTREAM.json` and checked by
`scripts/sync-ot-diagram.mjs --check`), whose pivot is a Rust translation of
parts of that class. The parts of `emd.rs` that follow it, as its header
lists them:

| `emd.rs` | LEMON 1.3.1 `NetworkSimplex` |
|---|---|
| `find_entering_arc` (the scan: block size `max(√arcs, 10)`, restart at `next_arc`) | `BlockSearchPivotRule::findEnteringArc` |
| the walk to `join` in `certify` | `findJoinNode` |
| `find_leaving_arc` | `findLeavingArc`, specialised to uncapacitated arcs |
| `change_flow` (the flow update) | `changeFlow` |
| `update_tree_structure` | `updateTreeStructure` |
| `update_potential` (its double-double branch is new) | `updatePotential` |
| tree arrays `parent`, `pred`, `pred_dir`, `thread`, `rev_thread`, `succ_num`, `last_succ`, `dirty_revs`; `STATE_TREE`, `STATE_LOWER`, `DIR_UP`, `DIR_DOWN` | `_parent`, `_pred`, `_pred_dir`, `_thread`, `_rev_thread`, `_succ_num`, `_last_succ`, `_dirty_revs`; the same constants |

Not taken from LEMON, as `emd.rs` states: the feasible start (no big-M
artificial costs), the integer masses, the cycle sums that certify pivots,
the double-double potentials, the full pass, the diagonal matching
(`init_diagonal`, `diagonal_matching`) and the LP-duality certificate
`verify`. The other copied files, `rust/ot-diagram/src/persistence.rs`
(the Wasserstein and bottleneck distances), `emd/assignment.rs` (linear
assignment, written from Jonker and Volgenant 1987), `util.rs` and
`error.rs`, take nothing from LEMON.

`emd.rs` is not in the npm package, and the `.wasm` is object code, for which
BSL-1.0 does not require the notice; the package stays MIT. The notice and
the licence text are reproduced here anyway, and the crate `ot-diagram` is
licensed `MIT AND BSL-1.0`.

The notice of `lemon/network_simplex.h`:

```text
This file is a part of LEMON, a generic C++ optimization library.

Copyright (C) 2003-2013
Egervary Jeno Kombinatorikus Optimalizalasi Kutatocsoport
(Egervary Research Group on Combinatorial Optimization, EGRES).

Permission to use, modify and distribute this software is granted
provided that this copyright notice appears in all copies. For
precise terms see the accompanying LICENSE file.

This software is provided "AS IS" with no warranty of any kind,
express or implied, and with no claim as to its suitability for any
purpose.
```

The accompanying LICENSE file of LEMON 1.3.1:

```text
LEMON code without an explicit copyright notice is covered by the following
copyright/license.

Copyright (C) 2003-2012 Egervary Jeno Kombinatorikus Optimalizalasi
Kutatocsoport (Egervary Combinatorial Optimization Research Group,
EGRES).

===========================================================================
Boost Software License, Version 1.0
===========================================================================

Permission is hereby granted, free of charge, to any person or organization
obtaining a copy of the software and accompanying documentation covered by
this license (the "Software") to use, reproduce, display, distribute,
execute, and transmit the Software, and to prepare derivative works of the
Software, and to permit third-parties to whom the Software is furnished to
do so, all subject to the following:

The copyright notices in the Software and this entire statement, including
the above license grant, this restriction and the following disclaimer,
must be included in all copies of the Software, in whole or in part, and
all derivative works of the Software, unless such copies or derivative
works are solely in the form of machine-executable object code generated by
a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE
FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
```

## Ripser — no longer vendored (removed 2026-10-05)

Until 2026-10-05 a vendored copy of Ripser (MIT plus the enhancement-grant
clause of its `CONTRIBUTING.txt`; master `01add51ff64aaf40889483260cc5c3b7d0f2a1e7`
with a hand back-port of the `tight-representative-cycles` branch,
`f5452008659775f4d8d7b57b60e3b11349b9bb90`) was compiled into the module for
the representative-cycle methods. It is gone: the representatives
(`ripsPersistence` with `representatives`) are computed by the Rust core
(see "Rust core" below), which links no Ripser code, so no Ripser file ships
and its licence text is no longer reproduced. The Rust core's cycles reduce
past the pivot ("exhaustive reduction"), the idea of that upstream branch,
credited in `rust/tda-core/src/rips/reps.rs`; the code was written for this
package, not ported from `ripser.cpp`. ripser.py is used as a black-box test
oracle only (`test/fixtures/rips_representatives/ripser_py.json`).

## Not vendored: ellipsoid-complex reference implementations

None of the following ships in the `.wasm` or is redistributed, and no code
from any of them is in this repository. They are recorded here because they
were consulted, because two of them are run out of tree to generate
test-fixture data
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
  it is commit-pinnable like Geogram.
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
- **How it is used:** only as an external oracle. It is *run* out of tree by
  `test/native/gen_ellipsoid_fixture.py` to record fixture numbers (the shape
  matrices `sigma` and the births `filtration_a` in
  `test/native/ellipsoid_fixture.hpp`); the recorded values are measurements of
  a computation, not its code. Its source was read to match its fitting
  conventions (the neighbourhood counts the point itself, the long axis
  normalized to 1, the `1e-4` floor on the semi-axes, every axis 1 for a
  degenerate neighbourhood, the factor 2 to the Rips scale), so that the
  numbers are comparable.
  `src/geom/ellipsoid_complex.hpp` is written from the paper, with the paper's
  propositions cited at each step, and contains no code from this repository.
  A test-only helper, `ellipsoid_pair_birth_gh12`, followed its
  `find_intersection_radius` statement by statement; it was deleted on
  2026-10-10, and the test that used it now checks the K-function's sign
  change at the solver's enclosure instead.
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

## Not vendored: zigzag persistence reference implementations

`zigzagPersistence` (`rust/tda-core/src/zigzag.rs` since 2026-10-11, a port
of this package's C++ `src/geom/zigzag_fast.hpp`, now
`test/native/zigzag_fast.hpp`; until 2026-10-05 the
opt-in `*Fast` twins of GUDHI's engine) implements the FastZigzag conversion, written from the paper
(Dey–Hou) after reading Dionysus 2's `zigzag-cone.h` (BSD-3) as prior art; the
read-back follows its value convention, and no code is copied. The Rust port
was written from this package's C++ alone. Nothing
below ships in the `.wasm`, is redistributed, or is transcribed into this repo.
They are recorded here because the decision of which route to take was made
against them, and because one of them cannot be used at all.

The algorithm itself is not a licensed object. Tamal K. Dey and Tao Hou, "Fast
Computation of Zigzag Persistence", ESA 2022, LIPIcs vol. 244, 43:1-43:15,
DOI 10.4230/LIPIcs.ESA.2022.43, arXiv:2204.11080, is published by Dagstuhl
under **CC BY 4.0**. Implementing a published algorithm from its text is what
this repository already does for the wing complex, the ellipsoidal Cech
complex, the box filtration and the volume-optimal cycles.

### Dionysus 2 — modified BSD, evaluated for vendoring, NOT vendored

- **License:** modified (3-clause) BSD — `LICENSE.txt`, "Dionysus Copyright (c)
  2017, The Regents of the University of California, through Lawrence Berkeley
  National Laboratory (subject to receipt of any required approvals from the
  U.S. Dept. of Energy). All rights reserved.", the three standard BSD
  conditions, and a *voluntary* enhancements grant-back paragraph of the same
  shape as Ripser's, accepted here while Ripser was vendored. `LEGAL.txt` adds the
  standard US Department of Energy government-purpose notice. Commercially
  usable, MIT-compatible, and not a close call.
- **Repository:** https://github.com/mrzv/dionysus
- **Evaluated at:** commit `a1703fe977f85540fa05b56e59192ba936173779`
  (2026-09-02, master)
- **What it is:** `include/dionysus/zigzag-cone.h` (121 lines) provides
  `make_zigzag_cone` and `init_zigzag_diagrams` — a permissively licensed
  implementation of the same FastZigzag idea, citing arXiv:2204.11080, plus the
  apex-representative work of arXiv:2502.17704. Its reducer
  (`ordinary-persistence.h`, `reduced-matrix.h/.hpp`, `reduction.h`, `chain.h`,
  `chain.hpp`, `fields/z2.h`, 937 lines together) is genuinely Boost-free.
- **Decision: do not vendor.** The licence was fine; the fit was not.
  1. **The interface does not match our input.** `make_zigzag_cone` is written
     over simplices identified by *vertex sets*: it builds cone cells with
     `Cell::join(w)`, tests membership with `contains(w)`, and recovers the
     right copy of a face through `LinkedMultiFiltration::index(cell, i)`, a
     search in a `boost::multi_index_container` keyed by the vertex set. This
     package's zigzag contract is integer cell ids with explicit boundaries and
     no vertex sets at all. Driving the upstream header would mean adapter
     types whose `join` and `contains` are fictions over a copy index — more
     code than the conversion is, and less honest about what it does.
  2. **Its filtration containers need Boost.MultiIndex.** `Filtration`,
     `LinkedMultiFiltration` and `Simplex` all pull in Boost. Boost was on
     the include path then (GUDHI needed it; neither is since 2026-10-05), so
     this was not fatal, but a
     `multi_index_container` lookup per boundary face is exactly the cost our
     own copy bookkeeping removes: we already know which copy of a face is live
     when a coface is inserted, because we walked the operations to find out.
  3. **Its reducer has no clearing.** `ordinary-persistence.h` carries
     `// TODO: add clearing optimization` and the `FastPersistence` alias has
     its clearing visitor commented out `// FIXME`. Clearing is the whole
     practical win available behind this conversion — the FastZigzag paper's
     own argument is that converting to a standard filtration lets any standard
     persistence optimisation apply for free — so vendoring the reducer would
     have meant vendoring the part we most wanted to change.
  4. **Amount of foreign code.** The two useful headers plus the reducer are
     ~1058 lines, against 400 lines of our own that fit our types exactly and
     that the whole differential harness can hold to account.
- **How it was used:** `zigzag-cone.h` was read as prior art before
  `src/geom/zigzag_fast.hpp` was written from the paper; the read-back
  follows its value convention, and no code is copied from it. The
  read-back rule was verified against GUDHI's documented example and a
  Betti-number oracle, and since 2026-10-04 also against the output of
  Dionysus 2.2.3's `zigzag_homology_persistence` on 24 sequences with
  removals and reinsertions (`test/fixtures/python_zigzag.json`, recorded out
  of tree; `test/python_zigzag.test.mjs`).

### FZZ / FastZigzag (Dey and Hou) — NO LICENCE, must not be used

- **License: none.** `github.com/taohou01/fzz` and the mirror
  `github.com/TDA-Jyamiti/fzz` have no `LICENSE` or `COPYING` file; the GitHub
  licence API returns `null`. The only grant is a README paragraph: "This
  software was developed (and is copyrighted by) the CGTDA research group at
  Purdue University. Please do not redistribute this software. This program is
  for academic research use only." It also links PHAT, which is LGPL-3.0.
- **Status:** not vendored, not linked, not transcribed, and not translated
  line by line into any language. "Academic research use only" and "please do
  not redistribute" are each independently fatal for a product that ships a
  `.wasm`. It may be read; it was not. The *paper* is CC BY 4.0 and is what
  `src/geom/zigzag_fast.hpp` (now `test/native/zigzag_fast.hpp`) and its
  Rust port `rust/tda-core/src/zigzag.rs` implement.

### HomCloud, RuCPD, giotto-ph — copyleft, not usable here

GPL-3.0-or-later, GPL-3.0-or-later (and it submodules FZZ), and AGPL-3.0
respectively. SPEC.md NFR-1 forbids a copyleft dependency in the WASM build.
The licence texts and the reasoning are quoted in `docs/ZIGZAG_BACKEND.md` §2.

## Rust crates linked into `dist/ladder/tda_ladder_bg.wasm`

The commutative-ladder engine (`ladder/`) is this package's own code (MIT).
Its core crate `tda-ladder` has no dependencies. The wasm surface
`tda-ladder-wasm` links, through wasm-bindgen 0.2.128 (versions pinned in
`ladder/Cargo.lock`):

- **wasm-bindgen** 0.2.128, **wasm-bindgen-shared** 0.2.128 — MIT OR
  Apache-2.0. https://github.com/wasm-bindgen/wasm-bindgen. The generated
  JavaScript glue `dist/ladder/tda_ladder.js` and `.d.ts` are its output.
- **once_cell** 1.21.4, **cfg-if** 1.0.5 — MIT OR Apache-2.0.
- **The Rust standard library** (`core`, `alloc`, `std`) — MIT OR Apache-2.0.

Build-time only (proc macros, not in the `.wasm`): wasm-bindgen-macro,
wasm-bindgen-macro-support, syn, quote, proc-macro2, unicode-ident, bumpalo,
rustversion — all MIT OR Apache-2.0 (unicode-ident also Unicode-3.0).

## Not vendored: commutative ladder reference implementations

- **commutazzio** (github.com/CommutativeGrid/commutazzio) — its licence
  statements disagree: `setup.py` and the MIT notice at the head of `LICENSE`
  say MIT; the README and the GPL-3.0 text that makes up the rest of
  `LICENSE` say GPL-3.0. Its `setup.py` requires fzzpy, and some of its
  functions call FZZ through it.
- **RuCPD** (bitbucket tda-homcloud/rucpd) — GPL-3.0-or-later, submodules FZZ.
- **FZZ / fzzpy** — academic research use only (see above).

None of them is a dependency, and no code from any of them is included in
this repository. None was installed or run, and no source of any of them was
read, while `ladder/` was written; of commutazzio, the README and `LICENSE`
were read for the licence facts above. The engine is written from
arXiv:2310.03649, arXiv:1404.7588, arXiv:2111.15058 and arXiv:2204.11080 (its
zigzag conversion is ported from `src/geom/zigzag_fast.hpp`, above, now
`test/native/zigzag_fast.hpp`), and its
oracles are this package's own (dense linear algebra, Hom dimensions, the
Rips engine for the row diagrams).

commutazzio 0.5.2, with fzzpy (which compiles FZZ), was run afterwards
(2026-10-05) for a comparison with the engine, in a virtual environment
outside this repository and through its public API. That comparison was
removed from this repository on 2026-10-10 (CHANGELOG.md).

commutazzio 0.5.2 is run as an external comparison of the CL(4)
decomposition (`benchmarks/ladder_decomposition/`, since 2026-10-10):
installed with `uv pip install --no-deps` into a virtual environment
outside this repository, with every other requirement of its `setup.py` but
not fzzpy, and called as a black box through its public API from a separate
process. FZZ and fzzpy are not installed there and do not run:
`install_commutazzio.sh` fails if `import fzzpy` or `import fzz` succeeds in
that environment, and the worker checks after every call that neither module
is loaded. For this comparison no FZZ or fzzpy code was downloaded, read or
run, and no code of commutazzio is included; commutazzio's source was not
read, apart from its `setup.py` (for the requirements) and a keyword search
for `fzz` that located its fzzpy imports.
Only the comparison scripts and their results are committed. RuCPD was not
installed or run.

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

## GUDHI `DelaunayCechComplex` (Python) — test-fixture generator only, NOT distributed

- **License:** the Python module `gudhi/delaunay_complex.py` of GUDHI 3.12.0
  declares GPL v3 (it is built on CGAL); the GUDHI C++ headers this package
  compiled until 2026-10-05 are MIT.
- **Status:** Not vendored, not linked, not transcribed. Run out of tree by
  `scripts/generate_delaunay_cech_oracle.py` to produce
  `test/fixtures/delaunay_cech/gudhi_oracle.json`, the external check of the
  Delaunay–Čech complex. `src/geom/delaunay_cech.hpp` builds on this
  package's own Geogram path and enclosing-ball code; its value rule is the
  rule of GUDHI's C++ `assign_MEB_filtration` (`MEB_filtration.h`, MIT),
  stated and justified from the definition in `src/geom/cech_complex.hpp`.
  Only the generated numerical data is committed, and data produced by a
  program is not a derivative work of that program.

## Rust core (linked into `dist/tda.wasm`)

- **Own code:** `rust/tda-core` (Rips persistence and its representative
  cycles and cocycles, cubical persistence, the Rips, flag, explicit and
  cubical complexes) and `rust/tda-core-c` (its C ABI for the Emscripten
  module, which also calls `ot-diagram`), part of this package, both MIT, with
  no dependencies beyond each other and `ot-diagram`. The algorithms are
  written from the papers cited in the module docs (Bauer's Ripser paper, de
  Silva–Morozov–Vejdemo-Johansson for the cohomology/homology duality the
  representative cycles rest on, Boissonnat–Pritam and Glisse–Pritam for edge
  collapse, union-find with Alexander duality for cubical complexes).
- **`rust/ot-diagram`:** the exact Wasserstein and bottleneck distances of
  `diagramWasserstein` and `diagramBottleneck`. Every file but `lib.rs` is a
  verbatim copy of ot-wasm's `crates/ot-core/src/` (`persistence.rs`,
  `emd.rs`, `emd/assignment.rs`, `util.rs`, `error.rs` at commit `24b6ee2`;
  ot-wasm is Topolab's own, MIT), so `@topolab/tda-wasm` and
  `@topolab/ot-wasm` run the same code. `rust/ot-diagram/UPSTREAM.json`
  records the commit and each file's SHA-256, and
  `scripts/sync-ot-diagram.mjs --check` (run by `npm test` and CI) fails when
  a copy differs. ot-core's bottleneck distance follows Efrat–Itai–Katz and
  Kerber–Morozov–Nigmetov; its network simplex pivot is derived from LEMON, so
  the crate is `MIT AND BSL-1.0` (see "LEMON" above). No runtime dependencies
  (`serde_json` in its tests only). Until 0.3.0 `rust/tda-core/src/diagram`
  held tda-wasm's own port of the same code (from ot-wasm `d7a97ba`); it is
  removed.
- No code from GPL, LGPL, AGPL or academic-only implementations (PHAT,
  CubicalRipser, giotto-ph, HomCloud, FZZ) was read or used in these crates.
  GUDHI, POT, Hera, ripser.py and CubicalRipser are used only as black-box
  test oracles.
- **Rust standard library** (`core`, `alloc`, `std`, for
  `wasm32-unknown-emscripten`) — MIT OR Apache-2.0, linked into the `.wasm` by
  the Rust compiler (1.98.1).

## Emscripten

- **License:** MIT
- **Version:** 4.0.15 (CI and the maintainer toolchain)
- **Source:** https://emscripten.org/
- **Used for:** Compiling the C++ sources to WebAssembly; portions of the
  Emscripten runtime are embedded in the generated `.mjs` loader.

### Emscripten runtime libraries linked into the shipped binary

Emscripten links its own C and C++ runtime into every binary it produces.
These are not dependencies this package chooses or vendors, but they are
present in the distributed `dist/tda.wasm` and `dist/tda.mjs`, so they are
listed here:

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
