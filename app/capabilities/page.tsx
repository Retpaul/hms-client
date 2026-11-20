import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Brand, Icon } from '@/components/shared/identity';
import { publicCapabilities } from '@/lib/public-capabilities';

export const metadata:Metadata={title:'Capabilities',description:'A more connected working day for your hospital, your people and your patients.'};

export default function Capabilities(){
  return <div className="capabilities-page">
    <header className="cap-header cap-shell"><Brand/><nav aria-label="Main navigation"><Link href="/">The platform</Link><Link href="/capabilities" aria-current="page">Capabilities</Link></nav><Link href="/auth/sign-in" className="button small">Sign in <Icon name="arrow" size={15}/></Link></header>
    <main>
      <section className="cap-hero cap-shell" aria-labelledby="cap-heading">
        <div className="cap-hero-copy"><span className="cap-overline"><i/> ONE HOSPITAL. EVERY TEAM.</span><h1 id="cap-heading">More connected care.<br/><em>A clearer day.</em></h1><p>Bring your people and everyday work together, so more attention stays with patients.</p><div className="cap-hero-actions"><Link className="button primary" href="/auth/get-started">Get started <Icon name="arrow" size={17}/></Link><a className="cap-text-link" href="#possibilities">A little of what’s possible <span>↓</span></a></div><div className="cap-hero-footnote"><span className="cap-mini-mark">✚</span><span>Thoughtfully connected.<br/><strong>Built around people.</strong></span></div></div>
        <div className="cap-hero-visual"><div className="cap-photo-outline" aria-hidden="true"/><div className="cap-photo"><Image src="/images/doctor-team.png" alt="Illustrative team of Nigerian doctors in a bright clinical setting" fill preload sizes="(max-width: 760px) 90vw, (max-width: 1100px) 45vw, 530px"/></div><div className="cap-photo-note"><span><Icon name="heart" size={21}/></span><div><strong>A little more connected.</strong><small>A little more room for care.</small></div></div><span className="cap-photo-caption">Illustrative medical team</span></div>
      </section>
      <section id="possibilities" className="cap-possibilities cap-shell" aria-labelledby="possibilities-heading"><div className="cap-section-heading"><div><span className="cap-overline">THE POSSIBILITIES</span><h2 id="possibilities-heading">Better together.<br/>Across your organisation.</h2></div><p>A few ways HMS brings people,<br className="cap-desktop-break"/> care and everyday work closer.</p></div><div className="cap-benefit-grid">{publicCapabilities.map((capability,index)=><article className="cap-benefit" key={capability.id} id={capability.id}><div className="cap-benefit-top"><span className={`cap-benefit-icon cap-tone-${index}`}><Icon name={capability.icon} size={24}/></span><span className="cap-benefit-number">0{index+1}</span></div><h3>{capability.title}</h3><p>{capability.description}</p></article>)}</div></section>
      <section className="cap-access cap-shell"><div className="cap-access-symbol"><Icon name="lock" size={24}/></div><div><h2>The right access, for the right people.</h2><p>Your organisation decides who can access its workspace.</p></div><span className="cap-access-line" aria-hidden="true"/></section>
      <section className="cap-closing cap-shell"><div className="cap-closing-inner"><div><span className="cap-overline">MAKE ROOM FOR BETTER CARE</span><h2>Your people.<br/>A more connected day.</h2><p>Start bringing your organisation together.</p></div><div className="cap-closing-actions"><Link className="button white" href="/auth/get-started">Set up your organisation <Icon name="arrow" size={17}/></Link><span>Already part of a team? <Link href="/auth/sign-in">Sign in</Link></span></div><div className="cap-closing-cross" aria-hidden="true">✚</div></div></section>
    </main>
    <footer className="cap-footer cap-shell"><Brand/><p>Connected care. Considered details.</p><Link href="/">Back to the platform <Icon name="arrow" size={15}/></Link></footer>
  </div>;
}
