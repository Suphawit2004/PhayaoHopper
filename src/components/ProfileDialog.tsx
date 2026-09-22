"use client";

import { useEffect, useRef } from "react";
import ProfileView from "./ProfileView";

type ProfileDialogProps = {
  onClose: () => void;
};

export default function ProfileDialog({ onClose }: ProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    else onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="profile-dialog"
      aria-labelledby="profile-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        const target = event.target as HTMLElement;
        const link = target.closest("a");
        if (link && !link.getAttribute("href")?.startsWith("#")) close();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <ProfileView inDialog onClose={close} />
    </dialog>
  );
}
