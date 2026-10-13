import type { Metadata } from "next";
import Link from "next/link";
import { ContactAddress, LegalPage } from "@/components/layout/legal-page";
import { LEGAL } from "@/content/legal";

export const metadata: Metadata = {
  title: "License",
  description:
    "What you may do with Shadeon shader code: it is MIT licensed, including for commercial projects.",
  alternates: { canonical: "/legal/license" },
};

const MIT = `MIT License

Copyright (c) 2026 ${LEGAL.operator}

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
SOFTWARE.`;

const thirdParty = [
  { name: "Instrument Sans (typeface)", license: "SIL Open Font License 1.1" },
  { name: "Geist Mono (typeface)", license: "SIL Open Font License 1.1" },
  { name: "Phosphor Icons", license: "MIT" },
  { name: "Shiki (syntax highlighting)", license: "MIT" },
  { name: "Next.js and React", license: "MIT" },
];

export default function LicensePage() {
  return (
    <LegalPage
      title="License"
      lead="The short version: the shader code is MIT licensed. Use it in personal and commercial work, change it as you like, and keep the notice at the top of the file."
    >
      <h2>What the license covers</h2>
      <p>
        The MIT License below applies to the shader code you get from Shadeon: the React and
        TypeScript components, the JavaScript files, the GLSL fragment shaders, and the small
        runtime included in them. Each exported file carries a header naming the shader, its version
        and the license.
      </p>

      <h2>What you may do</h2>
      <ul>
        <li>Use the code in personal, client and commercial projects, without paying.</li>
        <li>Change it: colours, behaviour, the GLSL itself.</li>
        <li>Ship it inside your product, open source or closed.</li>
        <li>Include it in templates and themes that you sell or give away.</li>
      </ul>

      <h2>What you must do</h2>
      <ul>
        <li>
          Keep the copyright and license notice in copies of the code. In practice that means
          leaving the header comment in the file. It does not need to be visible to your visitors.
        </li>
      </ul>

      <h2>What the license does not cover</h2>
      <ul>
        <li>
          The Shadeon name and logo. Please do not present your product as Shadeon or as endorsed by
          Shadeon.
        </li>
        <li>
          This website itself: its design, text and layout are not licensed for reuse. The shaders
          are; the site around them is not.
        </li>
        <li>
          Shaders that may be offered later under a paid plan can have different terms. Those terms
          will be shown with those shaders. Code you already obtained under the MIT License stays
          under the MIT License.
        </li>
      </ul>

      <h2>No warranty</h2>
      <p>
        The code is provided as it is. It is tested, but it comes with no guarantee that it suits
        your purpose or is free of defects. The license text below and the{" "}
        <Link href="/legal/terms">Terms of Use</Link> say this formally.
      </p>

      <h2>Where the shaders come from</h2>
      <p>
        Every shader is written from scratch for Shadeon. Nothing is copied or ported from other
        shader collections. Shaders use general, published techniques such as value noise and domain
        warping; techniques are not anyone&apos;s property, and the code that implements them here
        is our own.
      </p>
      <p>
        If you believe something on this site infringes your copyright, write to <ContactAddress />{" "}
        with a link to the material, a description of your work, and your contact details. We will
        look into it and remove anything that should not be here.
      </p>

      <h2>The license text</h2>
      <pre className="border-line bg-bg-sunken text-text rounded-card overflow-x-auto border p-4 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
        {MIT}
      </pre>

      <h2>Third-party software used by this website</h2>
      <p>
        The exported shader code has no dependencies. The website itself is built with open source
        software, including:
      </p>
      <ul>
        {thirdParty.map((item) => (
          <li key={item.name}>
            {item.name}, under the {item.license}.
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
