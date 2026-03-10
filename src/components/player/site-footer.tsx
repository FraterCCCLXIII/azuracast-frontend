"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type ModalType = "about" | "contact" | null;

function ObfuscatedEmail() {
  const [revealed, setRevealed] = useState(false);
  const [href, setHref] = useState<string>("#");
  const [label, setLabel] = useState<string>("");

  // Address is assembled only on user interaction — never in static HTML or
  // initial JS state, keeping it invisible to crawlers and harvesting bots.
  function reveal() {
    if (revealed) return;
    const u = [109, 111, 100, 101, 114, 110, 116, 101, 108, 101, 112, 97, 116, 104, 121]
      .map((c) => String.fromCharCode(c))
      .join("");
    const d = [103, 109, 97, 105, 108].map((c) => String.fromCharCode(c)).join("");
    setHref(`mailto:${u}@${d}.com`);
    setLabel(`${u}\u0040${d}.com`);
    setRevealed(true);
  }

  if (!revealed) {
    return (
      <button
        type="button"
        onClick={reveal}
        className="inline-flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-1.5 font-mono text-xs text-foreground/50 hover:text-foreground/80 hover:bg-muted/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Reveal email address"
      >
        <span className="select-none tracking-widest">● ● ● ● ● ● ● ● ● ● ● ●</span>
        <span className="text-[10px] uppercase tracking-widest opacity-60">reveal</span>
      </button>
    );
  }

  return (
    <a
      href={href}
      className="font-mono text-sm text-foreground/90 underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground/70 transition-all duration-200"
      aria-label="Send us an email"
    >
      {label}
    </a>
  );
}

// ---------- Manifesto content ----------
function ManifestoContent() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-foreground/85 max-h-[65vh] overflow-y-auto pr-1 [scrollbar-width:thin]">
      <p className="text-xs uppercase tracking-widest text-foreground/40 font-mono">
        Tiruvannamalai, India — Where the mountain is the master
      </p>

      <p className="text-base font-medium text-foreground/95 leading-snug">
        There is a mountain in South India that does not speak, yet has answered
        the deepest question of every being who has ever sat in its presence.
      </p>

      <p>
        <em>Arunachala.</em> The Hill of Fire. The self-luminous one. For
        millennia, seekers have come to its red earth — not to reach a summit,
        but to lose themselves. And in losing themselves, to find what they
        never actually lost.
      </p>

      <p>This radio station carries that spirit into sound.</p>

      <Separator className="opacity-30" />

      <h3 className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground/50">
        What We Are
      </h3>

      <p>
        We are not an entertainment platform. We are not background noise. We
        are not a distraction from life.
      </p>

      <p>
        We are a <strong>frequency</strong>.
      </p>

      <p>
        A frequency that points — beneath the music, beneath the silence between
        notes — to the ever-present awareness that you already are. The
        stillness that holds every sound. The witnessing that watches every
        thought. The &ldquo;I&rdquo; before the story.
      </p>

      <p>
        Call it the Self. Call it Awareness. Call it what you will — it has
        always been here, closer than your own breath, more intimate than any
        sensation, prior to every experience. It was never born. It will never
        die. It is listening right now.
      </p>

      <Separator className="opacity-30" />

      <h3 className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground/50">
        Why Radio?
      </h3>

      <p>
        Because music has always been a doorway. Long before philosophy, long
        before scripture, the human heart was opened by sound. A melody heard in
        the right moment can dissolve a decade of seeking into simple, silent
        recognition. A chord can do what a thousand words cannot — point beyond
        the conceptual mind into the living presence of now.
      </p>

      <p>We curate with that intention.</p>

      <p>
        Every track, every set, every silence between songs is chosen to serve
        the remembrance. Not to create a mood — but to dissolve the moods. To
        thin the veil between the listener and the listening itself.
      </p>

      <Separator className="opacity-30" />

      <h3 className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground/50">
        For the Next Generation
      </h3>

      <p>
        The seekers coming of age now are navigating something unprecedented: a
        world of infinite information and profound inner hunger — a culture of
        ceaseless stimulation and a deep, unspoken longing for stillness.
      </p>

      <p>
        They will not find what they are looking for on social media. They will
        not find it in productivity hacks or self-optimization, or even in most
        spiritual content — which has itself become another form of noise.
      </p>

      <p>
        <strong>They need a different kind of signal.</strong>
      </p>

      <p>
        This station is built for them. For the ones who feel it — that
        something underneath everything, that pull toward what is real, that
        quiet knowing that cannot be explained but also cannot be denied.
      </p>

      <p>
        We offer no doctrine. No technique. No guru worship. Only music,
        silence, and an invitation:
      </p>

      <blockquote className="border-l-2 border-foreground/20 pl-4 italic text-foreground/70 my-2">
        Be still. Notice what is already here.
      </blockquote>

      <Separator className="opacity-30" />

      <h3 className="font-mono text-xs uppercase tracking-widest font-semibold text-foreground/50">
        In Memory of the Masters
      </h3>

      <p>
        This station is dedicated with deep reverence to the teachers who showed
        us the way — not by pointing to some distant shore, but by revealing
        that we are already the ocean.
      </p>

      <p>
        To those whose lives were their teaching, whose silence said more than
        any words, whose presence dissolved the seeker and left only the sought.
      </p>

      <p>
        Their names may differ. Their traditions may vary. But their gift was
        the same: the direct recognition that awareness itself is the answer —
        that the Self you have been searching for is the very one searching.
      </p>

      <p>
        To <strong>Ramana Maharshi</strong>, the silent sage of Arunachala —
        whose very presence was the teaching. He asked only one question:{" "}
        <em>Who am I?</em> — and that question, turned inward with sincerity,
        became the most direct path home. He did not offer a system. He offered
        a mirror. In his stillness, thousands found the Self they had always
        been.
      </p>

      <p>
        To <strong>H.W.L. Poonja</strong> — Papaji — who carried Ramana&apos;s
        fire into the world and ignited it in hearts across every culture and
        continent. His thunderous insistence was simple and total:{" "}
        <em>You are already free.</em> Stop. Be quiet. See what remains. He
        blew away every excuse, every postponement, every spiritual ambition —
        and left only the naked, laughing recognition of what is.
      </p>

      <p>
        To <strong>Sri Aurobindo</strong>, who saw evolution not as something
        that happened to us in the past, but as something awakening through us
        right now — a conscious ascent from matter into spirit, from the surface
        mind into the supramental light. He showed that the inner work is not a
        retreat from the world, but its deepest transformation.
      </p>

      <p>
        To <strong>The Mother</strong>, Mirra Alfassa, who embodied that vision
        with fierce, practical devotion — who built the ashram, tended the
        community, and descended daily into the body&apos;s cells to bring the
        Divine all the way down. Her work reminds us that spirituality is not
        an escape into the heights, but a consecration of every ordinary moment.
      </p>

      <p>
        To <strong>Andrew Cohen</strong>, who demanded everything — who refused
        to let the teaching remain comfortable, who insisted that awakening must
        become the very ground we stand on, not an experience we visit. His
        relentless inquiry into what it means to be a new kind of human being in
        a new kind of world gave voice to the urgency this generation now feels.
      </p>

      <p className="text-foreground/60 italic">
        We bow to the lineage. We carry the lamp forward.
      </p>

      <Separator className="opacity-30" />

      <p className="text-[11px] text-foreground/35 text-center tracking-wider uppercase font-mono pt-1">
        Named after Tiruvannamalai &bull; Made in memory of the Masters
      </p>
    </div>
  );
}

// ---------- Contact content ----------
function ContactContent() {
  return (
    <div className="space-y-5 text-sm text-foreground/80">
      <p className="leading-relaxed">
        We welcome you to reach out — whether you have a question, a piece of
        music you feel belongs here, or simply something you want to share.
      </p>
      <p className="leading-relaxed">
        This station is a living act of devotion, built by human hands and open
        hearts. Your correspondence is received with the same spirit.
      </p>

      <div
        className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3 flex flex-col gap-1"
        aria-label="Contact email address"
      >
        <span className="text-[10px] uppercase tracking-widest text-foreground/40 font-mono">
          Email
        </span>
        <ObfuscatedEmail />
      </div>

      <p className="text-xs text-foreground/40 leading-relaxed">
        We read every message. Response times may vary — silence is also an
        answer here.
      </p>
    </div>
  );
}

// ---------- Main footer component ----------
export function SiteFooter() {
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const open = activeModal !== null;

  const footerLinkClass =
    "font-mono text-[11px] font-medium uppercase tracking-widest text-foreground/45 hover:text-foreground/80 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm px-0.5";

  return (
    <>
      {/* Sticky footer bar */}
      <footer
        aria-label="Site footer"
        className="fixed bottom-0 left-0 right-0 z-20 pointer-events-none"
      >
        <div
          className="pointer-events-auto mx-auto flex items-center justify-center gap-6 px-6 py-2.5"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 100%)",
          }}
        >
          <button
            type="button"
            className={footerLinkClass}
            onClick={() => setActiveModal("about")}
            aria-label="About this station"
          >
            About
          </button>

          <span className="text-foreground/20 text-[10px]" aria-hidden="true">
            &bull;
          </span>

          <button
            type="button"
            className={footerLinkClass}
            onClick={() => setActiveModal("contact")}
            aria-label="Contact us"
          >
            Contact
          </button>
        </div>
      </footer>

      {/* Modals */}
      <Dialog open={open} onOpenChange={(o) => !o && setActiveModal(null)}>
        {activeModal === "about" && (
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Our Manifesto
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground/40 uppercase tracking-widest font-mono">
                On music, silence &amp; the ever-present Self
              </DialogDescription>
            </DialogHeader>
            <ManifestoContent />
          </DialogContent>
        )}

        {activeModal === "contact" && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-tight">
                Get in Touch
              </DialogTitle>
              <DialogDescription className="text-xs text-foreground/40 uppercase tracking-widest font-mono">
                We&apos;d love to hear from you
              </DialogDescription>
            </DialogHeader>
            <ContactContent />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
