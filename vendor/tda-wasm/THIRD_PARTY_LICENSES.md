# Third-Party Licenses

The WebAssembly binary distributed with this package (`dist/tda.wasm`,
exported as `@topolab/tda-wasm/tda.wasm`, with its glue
`dist/pkg/tda_wasm.js`) is compiled from the Rust crates in `rust/`:
`rust/tda-wasm`, `rust/tda-core` and `rust/musl-math`, this package's own
code (musl-math a port of musl's MIT code, see "Rust core"), and
`rust/ot-diagram`, the diagram-distance code of ot-wasm's `ot-core`
(topolab's own) copied verbatim, whose network simplex pivot is derived from
LEMON (see "LEMON" and "Rust core" below); with the wasm-bindgen runtime
crates and the Rust standard library ("Rust code linked into the shipped WebAssembly modules" below).
Nothing else is linked or included: no C++ since 2026-10-16 (until then the
module was compiled by Emscripten from this package's C++,
historical `src/persistent_cohomology.cpp`, over the same Rust crates, with
Emscripten's runtime libraries; see "Emscripten"), and no GUDHI, Boost,
Eigen or CGAL header is compiled (GUDHI and Boost since 2026-10-05). One file of the Rust core carries code derived from GUDHI:
`rust/tda-core/src/geometry/sampling.rs`, an edited port of GUDHI 3.11.0's
`choose_n_farthest_points` (MIT; see "GUDHI" below). The package source is
licensed MIT (see LICENSE). The optional commutative-ladder engine is a second
binary, `dist/ladder/`.

No CGAL header is compiled, in any path (two pieces of the Geogram PSM,
vendored until 2026-10-15, came from CGAL code; see "Geogram"), and since
2026-10-05 GUDHI is not compiled
(see below). The weighted (regular) triangulations are the Rust core's
(`rust/tda-core/src/triangulation`, MIT, since 2026-10-15; they follow
Geogram's conventions, see "Geogram"); the min-enclosing-ball, power-sphere,
Čech, farthest-point-subsampling, kd-tree and weak-witness computations are
Rust in `rust/tda-core/src/geometry/` (since 2026-10-15), and so are the
Rips-type-ellipsoid, ellipsoidal-Čech, 2D wing-complex, box and k-fold cover
computations (`rust/tda-core/src/{ellipsoid,wing,boxes.rs,kfold}`, since
2026-10-15) (MIT, part of this package). Their former C++ was kept in
test/native as the tests' oracle until 2026-10-16 and is on the branch
`archive/cpp` (tag `archive/cpp-2026-10-16`) since; main keeps the fixtures
recorded from it. All of it was written
for this package except the farthest-point subsampling, which is the GUDHI
port named above; the Čech
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
- **Shipped code derived from GUDHI:** `rust/tda-core/src/geometry/sampling.rs`
  (compiled into `dist/tda.wasm`; until 2026-10-15 the C++
  `archive/cpp:test/native/sampling.hpp`, then the native tests' oracle
  archive/cpp:test/native/sampling.hpp, on the branch `archive/cpp` since 2026-10-16), whose `choose_n_farthest_points` is an edited port of GUDHI 3.11.0's
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
  Delaunay–Čech builders (`rust/tda-core/src/geometry/cech.rs`) is the
  rule of GUDHI's `assign_MEB_filtration` (`include/gudhi/MEB_filtration.h`):
  a simplex takes the enclosing ball of the first facet whose ball contains
  the omitted vertex, else computes its own; here on this package's own
  enclosing-ball code. The weak witness enumeration
  (`rust/tda-core/src/geometry/witness.rs`) is written from the definitions, and its
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
  (`archive/cpp:test/native/twist_persistence.hpp`, since 2026-10-11 its Rust port
  `rust/tda-core/src/persistence`), zigzag is the FastZigzag conversion
  (`archive/cpp:test/native/zigzag_fast.hpp`, since 2026-10-11 its Rust port
  `rust/tda-core/src/zigzag.rs`; the two C++ files were test oracles in
  test/native until 2026-10-16 and are on the branch `archive/cpp` since), the witness enumeration and the dimension-0
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
  GUDHI's C++ headers in three native tests
  (`archive/cpp:test/native/test_tree_persistence.cpp`, `archive/cpp:test/native/test_alpha_persistence.cpp`,
  `archive/cpp:test/native/test_cubical_axes.cpp`) until 2026-10-16, when those tests moved to the
  branch `archive/cpp` and GUDHI's answers on their inputs became recorded
  fixtures (`rust/tda-core/tests/fixtures/persistence_gudhi/`, recorded with
  Python gudhi 3.12.0, and `fixtures/alpha_native/gudhi_alpha.tsv`, recorded
  with the C++ headers). The frozen witness reference
  `archive/cpp:test/native/witness_reference.hpp` (the pre-rewrite builder, derived from GUDHI code,
  with GUDHI's MIT notice) went to `archive/cpp` with them; its outputs are
  recorded in `rust/tda-core/tests/fixtures/geometry_witness/witness_reference.txt`
  (numbers only, no code).
- **Boost** (BSL-1.0) came in with GUDHI's headers and left with them; the
  dispatch-only CI job that builds the external rhomboidtiling oracle still
  installs it, outside the package. **Eigen** (MPL-2.0) was on the include
  path without any header being included; it is no longer looked for.

GUDHI 3.11.0 `LICENSE`, reproduced in full (it applies to the port in
`rust/tda-core/src/geometry/sampling.rs`, whose source header carries
"Copyright (C) 2016 Inria"):

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

## Geogram (Delaunay PSM) — conventions ported; vendored until 2026-10-15

- **License:** BSD-3-Clause
- **Source:** https://github.com/BrunoLevy/geogram.psm.Delaunay (vendored
  from commit `0bcf18b30d828a6840cf573220f88d2fdcf18631` under `third_party/`
  until 2026-10-15)
- **Copyright:** the PSM sources (`Delaunay_psm.cpp`, `Delaunay_psm.h`)
  carry "Copyright (c) 2000-2022 Inria" with a non-endorsement clause naming
  the ALICE Project-Team; the PSM repository's `LICENSE` file reads
  "Copyright (c) 2022, Bruno Levy". Both notices are reproduced below and
  ship with the npm package and the release bundle in this file.
- **What remains of it:** no Geogram code is compiled or shipped. The
  regular triangulations and exact predicates in
  `rust/tda-core/src/triangulation` (MIT, new code) replaced, on
  2026-10-15, the `RegularWeightedDelaunay3d` / `RegularWeightedDelaunay2d`
  ("BPOW" / "BPOW2d") triangulations and the `PCK` predicates and
  `expansion_nt` arithmetic the weighted alpha, Delaunay–Čech and k-fold
  builders used. They reproduce Geogram's conventions on purpose: the BPOW
  lifting (`t = sqrt(W - w)`, height `((t^2 + x^2) + y^2) + z^2`, in 2D
  without `z`), the insertion semantics of `Delaunay3d` and `Delaunay2d` in
  weighted mode (first cell, repeated and hidden sites, the hull-facet rule)
  and, in 3D and in the k-fold cover's in-sphere test, the Simulation of
  Simplicity rule of `side4h_3d_exact_SOS` / `side4_3d_exact_SOS` term for
  term, so the 3D outputs are Geogram's wherever Geogram's were a function
  of its input. (The 2D tie rule is not Geogram's `side3h_2d_exact_SOS`,
  which is not a consistent perturbation; see `predicates2.rs`.) Those
  conventions are Geogram's and are used under the BSD-3 notices below. The
  exact arithmetic is Shewchuk's (Discrete Comput. Geom. 18, 1997; the
  algorithms are in the public domain). The data structures, walks and
  cavity code are written anew.
- **Its outputs as a test oracle:** before the removal, Geogram's results on
  1,300 triangulation inputs and about 280,000 predicate signs were recorded
  (`rust/tda-core/tests/fixtures/triangulation`, checked by
  `rust/tda-core/tests/triangulation_geogram.rs`).
- **History:** the PSM was vendored with three local patches (two in its
  random-number helpers, and the removal of an `EM_ASM` block in
  `GEO::initialize()` that mounted the host's directories under node.js,
  issue #21). Two pieces of it came from CGAL code whose copyright holder,
  Inria, is also Geogram's, under the BSD-3 notice below: the static filter
  of `in_sphere_3d_filter_optim` (CGAL's `Side_of_oriented_sphere_3`) and
  `HilbertSort3d` (CGAL's `Hilbert_sort_median_3`). Neither is ported.

The `LICENSE` file of the PSM repository:

```text
BSD 3-Clause License

Copyright (c) 2022, Bruno Levy
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

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
of ot-wasm's `crates/ot-core/src/emd.rs` (topolab's own; commit `24b6ee2`,
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
package, not ported from `archive/cpp:benchmarks/cross_language/ripser.cpp`. ripser.py is used as a black-box test
oracle only (`test/fixtures/rips_representatives/ripser_py.json`).

## Not vendored: ellipsoid-complex reference implementations

None of the following ships in the `.wasm` or is redistributed, and no code
from any of them is in this repository. They are recorded here because they
were consulted, because two of them are run out of tree to generate
test-fixture data
(`rust/tda-core/tests/fixtures/ellipsoid/gen_ellipsoid_fixture.py`), because one was evaluated for
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
  it is commit-pinnable like Geogram was.
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
     linked twice. It is the tight numerical pin in
     `rust/tda-core/tests/ellipsoid_cpp_properties.rs` (1.4e-13 relative over
     2232 edges; in the native `archive/cpp:test/native/test_ellipsoid.cpp` until 2026-10-16).
- **How it is used:** installed from PyPI into a throwaway virtualenv and called
  from `rust/tda-core/tests/fixtures/ellipsoid/gen_ellipsoid_fixture.py` to
  record `filtration_c` values.
  Not a build, test or runtime dependency of this package.

### a-zeg/ellipsoids — NO LICENCE, oracle data generator only

- **License:** **none.** There is no `LICENSE` file and the GitHub licence API
  returns 404. It therefore carries no grant to copy, modify or redistribute.
- **Repository:** https://github.com/a-zeg/ellipsoids
- **Pinned commit:** `d19c40cea6856c8434ba9fd98e1da5c1d5c0f217`
- **What it is:** the reference implementation accompanying arXiv:2408.11450, the
  paper the C++ `archive/cpp:test/native/ellipsoid_complex.hpp` (until 2026-10-15 `src/geom/`, then
  test/native, on the branch `archive/cpp` since 2026-10-16) and its Rust port `rust/tda-core/src/ellipsoid` implement.
- **How it is used:** only as an external oracle. It is *run* out of tree by
  `rust/tda-core/tests/fixtures/ellipsoid/gen_ellipsoid_fixture.py` to record fixture numbers (the shape
  matrices `sigma` and the births `filtration_a` in
  archive/cpp:test/native/ellipsoid_fixture.hpp until 2026-10-16, since then
  `rust/tda-core/tests/fixtures/ellipsoid/reference_oracles.txt`); the recorded values are measurements of
  a computation, not its code. Its source was read to match its fitting
  conventions (the neighbourhood counts the point itself, the long axis
  normalized to 1, the `1e-4` floor on the semi-axes, every axis 1 for a
  degenerate neighbourhood, the factor 2 to the Rips scale), so that the
  numbers are comparable.
  `archive/cpp:test/native/ellipsoid_complex.hpp` is written from the paper, with the paper's
  propositions cited at each step, and contains no code from this repository;
  neither does its Rust port, which follows the header operation for operation.
  A test-only helper, `ellipsoid_pair_birth_gh12`, followed its
  `find_intersection_radius` statement by statement; it was deleted on
  2026-10-10, and the test that used it now checks the K-function's sign
  change at the solver's enclosure instead.
- **Reproducing the fixtures** needs a local clone at that commit; the steps are
  in the header of `rust/tda-core/tests/fixtures/ellipsoid/gen_ellipsoid_fixture.py`. Fixture regeneration
  is a maintainer task, not part of `npm test` or CI.

### shill1729/ellph — NO LICENCE, not built, not consulted for numbers

- **Repository:** https://github.com/shill1729/ellph, the implementation
  referenced by arXiv:2606.01548 for the minimal-intersection-radius computation
  that the C++ `archive/cpp:test/native/ellipsoid_cech.hpp` (on the branch `archive/cpp` since 2026-10-16) and its Rust port
  `rust/tda-core/src/ellipsoid/cech.rs` also compute.
- **Licence:** none. No LICENSE file; the GitHub licence API returns 404. Its
  dependency list includes **ALGLIB**, which is GPL/commercial dual-licensed and
  must never be vendored here (NFR-1), plus NLopt (LGPL for some algorithms) and
  Boost/Eigen.
- **Status:** not vendored, not linked, not transcribed, and — unlike
  `a-zeg/ellipsoids` — **not even built or run out of tree**. It contributes no
  number to any fixture or test. `archive/cpp:test/native/ellipsoid_cech.hpp`, and so its Rust port, was written from
  the paper (Sections 2.1 and 2.3: the dual function of Eq. 1, the certificate of
  Eq. 4, Lemmas 2.8-2.11, Theorems 2.12-2.13 and 2.17, Proposition 2.18).
- **What we used as external checks instead**, precisely because the reference
  code is not usable: the paper's own *printed* Section 2.4 counterexample
  (three named ellipses in R^2 with a stated MIR of "approximately 4.87"), which
  is reproduced to 4.870561397481; the reduction to Welzl minimum enclosing balls
  in the isotropic limit, against code already oracled in this repo; and an
  independent primal verifier written for the purpose (in the native
  `archive/cpp:test/native/test_ellipsoid_cech.cpp` until 2026-10-16, ported to
  `rust/tda-core/tests/ellipsoid_cech_cpp_properties.rs`). A published number in a CC-BY paper
  carries no licence obligation on the code that reproduces it.
- The paper itself is CC BY 4.0, so quoting its statements and constants in
  comments and tests is fine with attribution, which is given at every use.

## Not vendored: zigzag persistence reference implementations

`zigzagPersistence` (`rust/tda-core/src/zigzag.rs` since 2026-10-11, a port
of this package's C++ `archive/cpp:test/native/zigzag_fast.hpp`, on the branch `archive/cpp`
since 2026-10-16; until 2026-10-05 the
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
  `archive/cpp:test/native/zigzag_fast.hpp` was written from the paper; the read-back
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
  `archive/cpp:test/native/zigzag_fast.hpp` (on the branch `archive/cpp` since 2026-10-16) and its
  Rust port `rust/tda-core/src/zigzag.rs` implement.

### HomCloud, RuCPD, giotto-ph — copyleft, not usable here

GPL-3.0-or-later, GPL-3.0-or-later (and it submodules FZZ), and AGPL-3.0
respectively. SPEC.md NFR-1 forbids a copyleft dependency in the WASM build.
The licence texts and the reasoning are quoted in `docs/ZIGZAG_BACKEND.md` §2.

## Rust code linked into the shipped WebAssembly modules (runtime notice bundle)

This is the complete list of the Rust crates that are compiled into
`dist/tda.wasm` and `dist/ladder/tda_ladder_bg.wasm`, with the licence of each
and the notices their licences require. It was made from `cargo tree -e
normal --target wasm32-unknown-unknown` and `cargo metadata` on
`rust/Cargo.lock` and `ladder/Cargo.lock`; `test/third_party_notices.test.mjs`
fails when a crate of that graph, at a version in the lockfile, is missing
here. The licence texts are in "Notice texts" at the end of this file.

Where a crate is offered under "MIT OR Apache-2.0", this package takes the MIT
branch (the Apache-2.0 text is reproduced anyway, below). This does not
change the licence of this package's own code.

| Crate | Version | Licence expression (crates.io) | Copyright notice in its sources | In `tda.wasm` | In `tda_ladder_bg.wasm` |
|---|---|---|---|:-:|:-:|
| wasm-bindgen | 0.2.129 | MIT OR Apache-2.0 | Copyright (c) 2014 Alex Crichton | yes | yes |
| wasm-bindgen-shared | 0.2.129 | MIT OR Apache-2.0 | Copyright (c) 2014 Alex Crichton | yes | yes |
| js-sys | 0.3.106 | MIT OR Apache-2.0 | Copyright (c) 2014 Alex Crichton | yes | no |
| futures-core, futures-task, futures-util | 0.3.34 | MIT OR Apache-2.0 | Copyright (c) 2016 Alex Crichton; Copyright (c) 2017 The Tokio Authors | yes | no |
| pin-project-lite | 0.2.17 | Apache-2.0 OR MIT | none in its LICENSE-MIT (author: taiki-e, the crate's repository owner) | yes | no |
| slab | 0.4.12 | MIT | Copyright (c) 2019 Carl Lerche | yes | no |
| once_cell | 1.21.4 | MIT OR Apache-2.0 | none in its LICENSE-MIT (author: Aleksey Kladov) | yes | yes |
| cfg-if | 1.0.5 | MIT OR Apache-2.0 | Copyright (c) 2014 Alex Crichton | yes | yes |
| unicode-ident | 1.0.26 | (MIT OR Apache-2.0) AND Unicode-3.0 | none in its LICENSE-MIT (author: David Tolnay); Unicode-3.0 part: Copyright (c) 1991-2023 Unicode, Inc. | yes | yes |
| libm | 0.2.16 | **MIT** | Copyright (c) 2018 Jorge Aparicio; portions of musl libc (Copyright (c) 2005-2020 Rich Felker, et al.), the CORE-MATH project, and the Sun, FreeBSD and Arm notices listed in its file | yes | no |
| `memory-phase` (this repository, `rust/memory-phase`) | 0.1.0 | own code | topolab | yes | yes |
| `musl-math` (this repository, `rust/musl-math`; derived from musl, see "Rust core" below) | 0.1.0 | own code; MIT-licensed musl and Arm optimized-routines parts | see "Rust core" | yes | no |
| `ot-diagram` (this repository; derived from LEMON, see "LEMON") | 0.1.0 | own code; BSL-1.0 part | see "LEMON" | yes | no |
| `tda-core`, `tda-wasm` / `tda-ladder`, `tda-ladder-wasm` (this repository) | | own code | topolab | yes | yes (ladder crates) |

`unicode-ident` is a dependency of `wasm-bindgen-shared`, so it is in the
dependency graph of both modules. Whether a given function of it survives in
the optimized `.wasm` was not checked; its notice, including the Unicode-3.0
permission notice, is included because the crate is compiled.

**The Rust standard library** (`core`, `alloc`, `std`; toolchain 1.98.1,
target `wasm32-unknown-unknown`) is MIT OR Apache-2.0, "Copyright The Rust
Project Developers", and is linked into both modules by the compiler. Its
sources carry notices of their own, which the toolchain publishes in
`share/doc/rust/COPYRIGHT-library.html`:
- `core`'s Unicode tables (`library/core/src/unicode`) are under Unicode-3.0,
  Copyright 1991-2024 Unicode, Inc. (text below);
- **dlmalloc** 0.2.13 (the allocator of this target; MIT OR Apache-2.0,
  Alex Crichton, derived from Doug Lea's public-domain `malloc.c`),
  **hashbrown** (the hash table of `std::collections`; MIT OR Apache-2.0,
  Amanieu d'Antras) and **compiler_builtins**, with the `libm` port it
  contains (MIT OR Apache-2.0; derived from musl and from the FreeBSD,
  Sun and Arm routines named in the libm notice below, and from LLVM
  compiler-rt, Apache-2.0 WITH LLVM-exception), are compiled into the
  standard library for this target. The exact list of crates inside the
  standard library depends on the toolchain release; the file named above
  is the authority for 1.98.1.

Build-time only, not in either `.wasm` (proc macros and the code generator
that runs inside `cargo build`): wasm-bindgen-macro,
wasm-bindgen-macro-support, syn, quote, proc-macro2, bumpalo, rustversion
(all MIT OR Apache-2.0). The generated JavaScript glue (`dist/pkg/tda_wasm.js`,
`dist/ladder/tda_ladder.js` and their `.d.ts` files) is wasm-bindgen's output
(MIT OR Apache-2.0, patched by `scripts/build_wasm.sh`); the crate list above
therefore covers the JavaScript that ships as well.

The ladder engine (`ladder/`) is this package's own code. `tda-ladder` depends
only on `memory-phase`, this repository's own allocation-telemetry crate;
`tda-ladder-wasm` adds wasm-bindgen 0.2.129 and the crates above.

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
zigzag conversion is ported from `archive/cpp:test/native/zigzag_fast.hpp`, above, on the
branch `archive/cpp` since 2026-10-16), and its
oracles are this package's own (dense linear algebra, Hom dimensions, the
Rips engine for the row diagrams).

commutazzio 0.5.2, with fzzpy (which compiles FZZ), was run afterwards
(2026-10-05) for a comparison with the engine, in a virtual environment
outside this repository and through its public API. That comparison was
removed from this repository on 2026-10-10 (docs/DEVELOPMENT_HISTORY.md).

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
  by `rust/tda-core/tests/fixtures/kfold/gen_kfold_fixture.py` as an
  out-of-tree ORACLE GENERATOR to produce
  `rust/tda-core/tests/fixtures/kfold/rhomboidtiling.txt` (until 2026-10-16
  archive/cpp:test/native/kfold_fixture.txt). Building it requires CGAL, which is
  why it stays out of this repository entirely;
  the k-fold cover builder (`archive/cpp:test/native/kfold_cover.hpp`, since 2026-10-15
  `rust/tda-core/src/kfold`) was written from the published papers
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
  Delaunay–Čech complex. `rust/tda-core/src/alpha/delaunay_cech.rs` builds on this
  package's own triangulation and enclosing-ball code; its value rule is the
  rule of GUDHI's C++ `assign_MEB_filtration` (`MEB_filtration.h`, MIT),
  stated and justified from the definition in
  `rust/tda-core/src/geometry/cech.rs`.
  Only the generated numerical data is committed, and data produced by a
  program is not a derivative work of that program.

## Rust core (linked into `dist/tda.wasm`)

- **Own code:** `rust/tda-core` (Rips persistence and its representative
  cycles and cocycles, cubical persistence, the Rips, flag, explicit and
  cubical complexes, the 3D regular triangulation; the triangulation follows
  Geogram's conventions, see "Geogram"), `rust/tda-wasm` (the module's
  bindings), part of this package, all MIT (until 2026-10-16 also the C ABI
  crate archive/cpp:rust/tda-core-c, linked into the Emscripten module and then used by
  the native C++ oracle tests; on the branch `archive/cpp` since), with
  no dependencies beyond each other, `ot-diagram`, `musl-math` and `libm` (below). The algorithms are
  written from the papers cited in the module docs (Bauer's Ripser paper, de
  Silva–Morozov–Vejdemo-Johansson for the cohomology/homology duality the
  representative cycles rest on, Boissonnat–Pritam and Glisse–Pritam for edge
  collapse, union-find with Alexander duality for cubical complexes).
- **`rust/ot-diagram`:** the exact Wasserstein and bottleneck distances of
  `diagramWasserstein` and `diagramBottleneck`. Every file but `lib.rs` is a
  verbatim copy of ot-wasm's `crates/ot-core/src/` (`persistence.rs`,
  `emd.rs`, `emd/assignment.rs`, `util.rs`, `error.rs` at commit `24b6ee2`;
  ot-wasm is topolab's own, MIT), so `@topolab/tda-wasm` and
  `@topolab/ot-wasm` run the same code. `rust/ot-diagram/UPSTREAM.json`
  records the commit and each file's SHA-256, and
  `scripts/sync-ot-diagram.mjs --check` (run by `npm test` and CI) fails when
  a copy differs. ot-core's bottleneck distance follows Efrat–Itai–Katz and
  Kerber–Morozov–Nigmetov; its network simplex pivot is derived from LEMON, so
  the crate is `MIT AND BSL-1.0` (see "LEMON" above). One runtime dependency,
  `musl-math` (below), whose `pow` `persistence.rs` calls in place of
  `f64::powf` since 2026-10-16; ot-core does the same since ot-wasm
  `7196ec8` (`serde_json` in the tests only). Until 0.3.0 `rust/tda-core/src/diagram`
  held tda-wasm's own port of the same code (from ot-wasm `d7a97ba`); it is
  removed.
- **`rust/tda-core/src/coupled_alpha`** (since 2026-10-15): the planar
  coupled alpha complex, a port of this package's own C++ builder (on the
  branch `archive/cpp` since 2026-10-16), with a software IEEE binary128
  (`binary128.rs`), because the C++ computed in `long double` and stable Rust
  has no `f128`. Provenance of `binary128.rs`:
  - `F128::hypot` transcribes musl's `src/math/hypotl.c` (the 113-bit
    significand branch) operation for operation, so that it gives the bits of
    the `hypotl` Emscripten linked. musl is MIT:

    ```
    Copyright © 2005-2020 Rich Felker, et al.

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    ```
  - Addition and multiplication follow the structure of LLVM compiler-rt's
    `fp_add_impl.inc` and `fp_mul_impl.inc` (Apache-2.0 WITH LLVM-exception;
    written in Rust here, no file copied; the Apache License 2.0 with the LLVM
    exception is reproduced in "Notice texts" below, so that the notice
    travels with the binary whether or not following the structure of those
    files makes `binary128.rs` a derivative of them), and the NaN results of addition
    follow Rust's `compiler_builtins` (MIT OR Apache-2.0), whose routines the
    module linked before the port. Division and square root are written here.
- **`rust/musl-math`** (since 2026-10-16): `exp`, `log`, `pow` and `hypot`,
  ported operation for operation from musl's `src/math` as Emscripten 4.0.15
  ships it, so that `tda-core` and `ot-diagram` give the bits of the
  Emscripten module on every target. `exp.c`, `pow.c`, `log.c` and the tables
  of `exp_data.c`, `pow_data.c` and `log_data.c` (`src/data.rs`, generated
  from them) are Szabolcs Nagy's routines from Arm Limited's
  optimized-routines, in musl under "Copyright (c) 2018, Arm Limited.
  SPDX-License-Identifier: MIT" (musl's COPYRIGHT: "Copyright © 2017-2018 Arm
  Limited ... licensed under extremely permissive terms"); `hypot.c` is
  musl's own. Both under musl's MIT licence:

    ```
    Copyright © 2005-2020 Rich Felker, et al.
    Copyright (c) 2018, Arm Limited (exp.c, pow.c, log.c and their data)

    Permission is hereby granted, free of charge, to any person obtaining
    a copy of this software and associated documentation files (the
    "Software"), to deal in the Software without restriction, including
    without limitation the rights to use, copy, modify, merge, publish,
    distribute, sublicense, and/or sell copies of the Software, and to
    permit persons to whom the Software is furnished to do so, subject to
    the following conditions:

    The above copyright notice and this permission notice shall be
    included in all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
    EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
    IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
    TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
    ```

  Its test crate `rust/musl-math-oracle` (not linked into any module) holds
  musl's recorded results; the C harness that recorded them
  (`emscripten/musl_eval.c`, `gen_tables.c`: own code, MIT) is on the branch
  `archive/cpp` since 2026-10-16.
- No code from GPL, LGPL, AGPL or academic-only implementations (PHAT,
  CubicalRipser, giotto-ph, HomCloud, FZZ) was read or used in these crates.
  GUDHI, POT, Hera, ripser.py and CubicalRipser are used only as black-box
  test oracles.
- **`libm` 0.2.16** (crates.io; licence **MIT**, `no_std`; not "MIT OR
  Apache-2.0": its metadata and its `LICENSE.txt` say MIT and ask contributors
  to dual-license, which does not change the licence of the published crate):
  `hypot`, `sin` and `cos` of the ellipsoid and wing builders, a Rust port of
  musl's libm, the code the Emscripten build of the C++ builders linked; the
  ported builders take it on every target so that native and WebAssembly
  builds give the same bits. Its `LICENSE.txt`, with the component notices it
  carries (musl, CORE-MATH, Sun Microsystems, FreeBSD, Arm), is in "Notice
  texts" below.
- **Rust standard library** (`core`, `alloc`, `std`, for
  `wasm32-unknown-unknown`; `wasm32-unknown-emscripten` until 2026-10-16) —
  MIT OR Apache-2.0, linked into the `.wasm` by the Rust compiler (1.98.1).

## Emscripten — until 2026-10-16 only

- **License:** MIT
- **Version:** 4.0.15
- **Source:** https://emscripten.org/
- **Used for:** until 2026-10-16, compiling the C++ sources to WebAssembly;
  portions of the Emscripten runtime were embedded in the generated `.mjs`
  loader. Not used since: the module is built with wasm-bindgen and contains
  no Emscripten runtime. The two recorders of test fixtures that still used it
  (musl's results, recorded by `rust/musl-math-oracle/emscripten/`; the
  coupled alpha oracle of `rust/tda-core/examples/coupled_alpha_differential.rs`)
  are on the branch `archive/cpp` since 2026-10-16; the fixtures they wrote
  stay.

### Emscripten runtime libraries linked into the binary until 2026-10-16

Emscripten links its own C and C++ runtime into every binary it produces.
These were present in the distributed `dist/tda.wasm` and `dist/tda.mjs`
until the switch to wasm-bindgen, and none is in the module now:

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

## Notice texts

Texts reproduced from the crates' own licence files (registry sources of the
versions in the lockfiles), for the notices required above.

### MIT License (wasm-bindgen, wasm-bindgen-shared, js-sys, futures-*, pin-project-lite, slab, once_cell, cfg-if, unicode-ident)

The copyright lines of each crate are in the table above; the permission
notice is the same for all of them:

    Permission is hereby granted, free of charge, to any
    person obtaining a copy of this software and associated
    documentation files (the "Software"), to deal in the
    Software without restriction, including without
    limitation the rights to use, copy, modify, merge,
    publish, distribute, sublicense, and/or sell copies of
    the Software, and to permit persons to whom the Software
    is furnished to do so, subject to the following
    conditions:

    The above copyright notice and this permission notice
    shall be included in all copies or substantial portions
    of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
    ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
    TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
    SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
    CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
    IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.

### Unicode License v3 (Unicode-3.0: unicode-ident's data tables; `core`'s Unicode tables)

    UNICODE LICENSE V3

    COPYRIGHT AND PERMISSION NOTICE

    Copyright © 1991-2023 Unicode, Inc.

    NOTICE TO USER: Carefully read the following legal agreement. BY
    DOWNLOADING, INSTALLING, COPYING OR OTHERWISE USING DATA FILES, AND/OR
    SOFTWARE, YOU UNEQUIVOCALLY ACCEPT, AND AGREE TO BE BOUND BY, ALL OF THE
    TERMS AND CONDITIONS OF THIS AGREEMENT. IF YOU DO NOT AGREE, DO NOT
    DOWNLOAD, INSTALL, COPY, DISTRIBUTE OR USE THE DATA FILES OR SOFTWARE.

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of data files and any associated documentation (the "Data Files") or
    software and any associated documentation (the "Software") to deal in the
    Data Files or Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, and/or sell
    copies of the Data Files or Software, and to permit persons to whom the
    Data Files or Software are furnished to do so, provided that either (a)
    this copyright and permission notice appear with all copies of the Data
    Files or Software, or (b) this copyright and permission notice appear in
    associated Documentation.

    THE DATA FILES AND SOFTWARE ARE PROVIDED "AS IS", WITHOUT WARRANTY OF ANY
    KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF
    THIRD PARTY RIGHTS.

    IN NO EVENT SHALL THE COPYRIGHT HOLDER OR HOLDERS INCLUDED IN THIS NOTICE
    BE LIABLE FOR ANY CLAIM, OR ANY SPECIAL INDIRECT OR CONSEQUENTIAL DAMAGES,
    OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS,
    WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
    ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THE DATA
    FILES OR SOFTWARE.

    Except as contained in this notice, the name of a copyright holder shall
    not be used in advertising or otherwise to promote the sale, use or other
    dealings in these Data Files or Software without prior written
    authorization of the copyright holder.

### libm 0.2.16 — `LICENSE.txt` (MIT; contributors' dual-license note and component notices)

    rust-lang/libm as a whole is available for use under the MIT license:

    ------------------------------------------------------------------------------
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
    ------------------------------------------------------------------------------

    As a contributor, you agree that your code can be used under either the MIT
    license or the Apache-2.0 license:

    ------------------------------------------------------------------------------
    [the Apache License 2.0, reproduced in full in "Apache License 2.0" below]
    ------------------------------------------------------------------------------

    This Rust library contains the following copyrights:

        Copyright (c) 2018 Jorge Aparicio

    Portions of this software are derived from third-party works licensed under
    terms compatible with the above MIT license:

    * musl libc https://www.musl-libc.org/. This library contains the following
      copyright:

          Copyright © 2005-2020 Rich Felker, et al.

    * The CORE-MATH project https://core-math.gitlabpages.inria.fr/. CORE-MATH
      routines are available under the MIT license on a per-file basis.

    The musl libc COPYRIGHT file also includes the following notice relevant to
    math portions of the library:

    ------------------------------------------------------------------------------
    Much of the math library code (src/math/* and src/complex/*) is
    Copyright © 1993,2004 Sun Microsystems or
    Copyright © 2003-2011 David Schultz or
    Copyright © 2003-2009 Steven G. Kargl or
    Copyright © 2003-2009 Bruce D. Evans or
    Copyright © 2008 Stephen L. Moshier or
    Copyright © 2017-2018 Arm Limited
    and labelled as such in comments in the individual source files. All
    have been licensed under extremely permissive terms.
    ------------------------------------------------------------------------------

    Copyright notices are retained in src/* files where relevant.

### Apache License 2.0

For every crate above offered as "MIT OR Apache-2.0" (not taken here), for the
contributor note in libm's licence, and for the LLVM-derived structure of
`rust/tda-core/src/coupled_alpha/binary128.rs`:

                                  Apache License
                            Version 2.0, January 2004
                         http://www.apache.org/licenses/

    TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION

    1. Definitions.

       "License" shall mean the terms and conditions for use, reproduction,
       and distribution as defined by Sections 1 through 9 of this document.

       "Licensor" shall mean the copyright owner or entity authorized by
       the copyright owner that is granting the License.

       "Legal Entity" shall mean the union of the acting entity and all
       other entities that control, are controlled by, or are under common
       control with that entity. For the purposes of this definition,
       "control" means (i) the power, direct or indirect, to cause the
       direction or management of such entity, whether by contract or
       otherwise, or (ii) ownership of fifty percent (50%) or more of the
       outstanding shares, or (iii) beneficial ownership of such entity.

       "You" (or "Your") shall mean an individual or Legal Entity
       exercising permissions granted by this License.

       "Source" form shall mean the preferred form for making modifications,
       including but not limited to software source code, documentation
       source, and configuration files.

       "Object" form shall mean any form resulting from mechanical
       transformation or translation of a Source form, including but
       not limited to compiled object code, generated documentation,
       and conversions to other media types.

       "Work" shall mean the work of authorship, whether in Source or
       Object form, made available under the License, as indicated by a
       copyright notice that is included in or attached to the work
       (an example is provided in the Appendix below).

       "Derivative Works" shall mean any work, whether in Source or Object
       form, that is based on (or derived from) the Work and for which the
       editorial revisions, annotations, elaborations, or other modifications
       represent, as a whole, an original work of authorship. For the purposes
       of this License, Derivative Works shall not include works that remain
       separable from, or merely link (or bind by name) to the interfaces of,
       the Work and Derivative Works thereof.

       "Contribution" shall mean any work of authorship, including
       the original version of the Work and any modifications or additions
       to that Work or Derivative Works thereof, that is intentionally
       submitted to Licensor for inclusion in the Work by the copyright owner
       or by an individual or Legal Entity authorized to submit on behalf of
       the copyright owner. For the purposes of this definition, "submitted"
       means any form of electronic, verbal, or written communication sent
       to the Licensor or its representatives, including but not limited to
       communication on electronic mailing lists, source code control systems,
       and issue tracking systems that are managed by, or on behalf of, the
       Licensor for the purpose of discussing and improving the Work, but
       excluding communication that is conspicuously marked or otherwise
       designated in writing by the copyright owner as "Not a Contribution."

       "Contributor" shall mean Licensor and any individual or Legal Entity
       on behalf of whom a Contribution has been received by Licensor and
       subsequently incorporated within the Work.

    2. Grant of Copyright License. Subject to the terms and conditions of
       this License, each Contributor hereby grants to You a perpetual,
       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
       copyright license to reproduce, prepare Derivative Works of,
       publicly display, publicly perform, sublicense, and distribute the
       Work and such Derivative Works in Source or Object form.

    3. Grant of Patent License. Subject to the terms and conditions of
       this License, each Contributor hereby grants to You a perpetual,
       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
       (except as stated in this section) patent license to make, have made,
       use, offer to sell, sell, import, and otherwise transfer the Work,
       where such license applies only to those patent claims licensable
       by such Contributor that are necessarily infringed by their
       Contribution(s) alone or by combination of their Contribution(s)
       with the Work to which such Contribution(s) was submitted. If You
       institute patent litigation against any entity (including a
       cross-claim or counterclaim in a lawsuit) alleging that the Work
       or a Contribution incorporated within the Work constitutes direct
       or contributory patent infringement, then any patent licenses
       granted to You under this License for that Work shall terminate
       as of the date such litigation is filed.

    4. Redistribution. You may reproduce and distribute copies of the
       Work or Derivative Works thereof in any medium, with or without
       modifications, and in Source or Object form, provided that You
       meet the following conditions:

       (a) You must give any other recipients of the Work or
           Derivative Works a copy of this License; and

       (b) You must cause any modified files to carry prominent notices
           stating that You changed the files; and

       (c) You must retain, in the Source form of any Derivative Works
           that You distribute, all copyright, patent, trademark, and
           attribution notices from the Source form of the Work,
           excluding those notices that do not pertain to any part of
           the Derivative Works; and

       (d) If the Work includes a "NOTICE" text file as part of its
           distribution, then any Derivative Works that You distribute must
           include a readable copy of the attribution notices contained
           within such NOTICE file, excluding those notices that do not
           pertain to any part of the Derivative Works, in at least one
           of the following places: within a NOTICE text file distributed
           as part of the Derivative Works; within the Source form or
           documentation, if provided along with the Derivative Works; or,
           within a display generated by the Derivative Works, if and
           wherever such third-party notices normally appear. The contents
           of the NOTICE file are for informational purposes only and
           do not modify the License. You may add Your own attribution
           notices within Derivative Works that You distribute, alongside
           or as an addendum to the NOTICE text from the Work, provided
           that such additional attribution notices cannot be construed
           as modifying the License.

       You may add Your own copyright statement to Your modifications and
       may provide additional or different license terms and conditions
       for use, reproduction, or distribution of Your modifications, or
       for any such Derivative Works as a whole, provided Your use,
       reproduction, and distribution of the Work otherwise complies with
       the conditions stated in this License.

    5. Submission of Contributions. Unless You explicitly state otherwise,
       any Contribution intentionally submitted for inclusion in the Work
       by You to the Licensor shall be under the terms and conditions of
       this License, without any additional terms or conditions.
       Notwithstanding the above, nothing herein shall supersede or modify
       the terms of any separate license agreement you may have executed
       with Licensor regarding such Contributions.

    6. Trademarks. This License does not grant permission to use the trade
       names, trademarks, service marks, or product names of the Licensor,
       except as required for reasonable and customary use in describing the
       origin of the Work and reproducing the content of the NOTICE file.

    7. Disclaimer of Warranty. Unless required by applicable law or
       agreed to in writing, Licensor provides the Work (and each
       Contributor provides its Contributions) on an "AS IS" BASIS,
       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
       implied, including, without limitation, any warranties or conditions
       of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
       PARTICULAR PURPOSE. You are solely responsible for determining the
       appropriateness of using or redistributing the Work and assume any
       risks associated with Your exercise of permissions under this License.

    8. Limitation of Liability. In no event and under no legal theory,
       whether in tort (including negligence), contract, or otherwise,
       unless required by applicable law (such as deliberate and grossly
       negligent acts) or agreed to in writing, shall any Contributor be
       liable to You for damages, including any direct, indirect, special,
       incidental, or consequential damages of any character arising as a
       result of this License or out of the use or inability to use the
       Work (including but not limited to damages for loss of goodwill,
       work stoppage, computer failure or malfunction, or any and all
       other commercial damages or losses), even if such Contributor
       has been advised of the possibility of such damages.

    9. Accepting Warranty or Additional Liability. While redistributing
       the Work or Derivative Works thereof, You may choose to offer,
       and charge a fee for, acceptance of support, warranty, indemnity,
       or other liability obligations and/or rights consistent with this
       License. However, in accepting such obligations, You may act only
       on Your own behalf and on Your sole responsibility, not on behalf
       of any other Contributor, and only if You agree to indemnify,
       defend, and hold each Contributor harmless for any liability
       incurred by, or claims asserted against, such Contributor by reason
       of your accepting any such warranty or additional liability.

    END OF TERMS AND CONDITIONS

    APPENDIX: How to apply the Apache License to your work.

       To apply the Apache License to your work, attach the following
       boilerplate notice, with the fields enclosed by brackets "[]"
       replaced with your own identifying information. (Don't include
       the brackets!)  The text should be enclosed in the appropriate
       comment syntax for the file format. We also recommend that a
       file or class name and description of purpose be included on the
       same "printed page" as the copyright notice for easier
       identification within third-party archives.

    Copyright [yyyy] [name of copyright owner]

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    	http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

### LLVM Exception to the Apache License 2.0

LLVM compiler-rt (`fp_add_impl.inc`, `fp_mul_impl.inc`; "Part of the LLVM
Project, under the Apache License v2.0 with LLVM Exceptions") and the
compiler-rt routines inside Rust's `compiler_builtins` are under the Apache
License 2.0 with this exception:

    ---- LLVM Exceptions to the Apache 2.0 License ----

    As an exception, if, as a result of your compiling your source code, portions
    of this Software are embedded into an Object form of such source code, you
    may redistribute such embedded portions in such Object form without complying
    with the conditions of Sections 4(a), 4(b) and 4(d) of the License.

    In addition, if you combine or link compiled forms of this Software with
    software that is licensed under the GPLv2 ("Combined Software") and if a
    court of competent jurisdiction determines that the patent provision (Section
    3), the indemnity provision (Section 9) or other Section of the License
    conflicts with the conditions of the GPLv2, you may retroactively and
    prospectively choose to deem waived or otherwise exclude such Section(s) of
    the License, but only in their entirety and only with respect to the Combined
    Software.
