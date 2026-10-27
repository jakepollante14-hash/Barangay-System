import sealImg from '../assets/images/barangay_seal_logo_1792164527116.jpg';

export const BARANGAY_SEAL_IMG = sealImg;
export const BARANGAY_HALL_IMG = 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80&w=600';
export const RESIDENT_DEFAULT_IMG = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

export const onSealError = (e: any) => {
  if (e?.currentTarget) e.currentTarget.style.display = 'none';
};

export const onResidentError = (e: any) => {
  if (e?.currentTarget) e.currentTarget.src = RESIDENT_DEFAULT_IMG;
};

export const onHallError = (e: any) => {
  if (e?.currentTarget) e.currentTarget.style.display = 'none';
};
