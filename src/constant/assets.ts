import sealImg from '../assets/images/barangay_seal_logo_1792164527116.jpg';

export const BARANGAY_SEAL_IMG = sealImg;
export const RESIDENT_DEFAULT_IMG = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150';

export const onSealError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.style.display = 'none';
};

export const onResidentError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.src = RESIDENT_DEFAULT_IMG;
};