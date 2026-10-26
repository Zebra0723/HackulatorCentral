"use client";

import { useRef } from "react";
import { Logo } from "./Logo";
import { NAV_LINKS } from "./nav";
import { Sponsor } from "./Sponsor";
import { CloseIcon, MenuIcon } from "./icons";

export function SiteHeader() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const open = () => dialogRef.current?.showModal?.();
  const close = () => dialogRef.current?.close?.();

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#top" className="site-header__brand" aria-label="Hackulator, back to top">
          <Logo priority alt="" />
        </a>
        <nav className="site-nav" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="site-header__actions">
          <a href="#build" className="btn btn-primary btn-sm site-header__cta">
            Build yours
          </a>
          <button
            ref={triggerRef}
            type="button"
            className="menu-button"
            aria-haspopup="dialog"
            aria-controls="menu-sheet"
            onClick={open}
          >
            <MenuIcon width={20} height={20} />
            <span className="visually-hidden">Open menu</span>
          </button>
        </div>
      </div>

      <dialog
        id="menu-sheet"
        ref={dialogRef}
        className="menu-sheet"
        aria-label="Menu"
        onClose={() => triggerRef.current?.focus()}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="menu-sheet__head">
          <Logo alt="Hackulator" className="menu-sheet__logo" />
          <button type="button" className="close-btn" onClick={close} autoFocus>
            <CloseIcon width={18} height={18} />
            <span className="visually-hidden">Close menu</span>
          </button>
        </div>
        <nav aria-label="Mobile">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={close}>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="menu-sheet__foot">
          <a href="#build" className="btn btn-primary btn-block" onClick={close}>
            Build your Hackulator
          </a>
          <Sponsor tone="light" />
        </div>
      </dialog>
    </header>
  );
}
