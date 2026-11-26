import { onColor } from '../utils/color.ts';
import { cn } from '../utils/cn.ts';
import { profileInitial, type Profile } from '../utils/profiles.ts';

/**
 * A profile's round badge: its colour with the first letter of its name on top (white or near-black, whichever is
 * readable on that colour). It is the same everywhere a profile is shown, so the person learns to read it at a glance.
 */
export function ProfileAvatar({ profile, size = 28, className }: { profile: Pick<Profile, 'name' | 'color'>; size?: number; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('flex flex-shrink-0 items-center justify-center rounded-full font-semibold leading-none select-none', className)}
      style={{ width: size, height: size, backgroundColor: profile.color, color: onColor(profile.color), fontSize: Math.round(size * 0.46) }}
    >
      {profileInitial(profile.name)}
    </span>
  );
}
