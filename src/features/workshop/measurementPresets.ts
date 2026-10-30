// Measurements printed in the shop's paper order books — offered as tick-boxes on the garment type form.
export const measurementPresets: { title: string; fields: string[] }[] = [
  {
    title: 'Blouse book',
    fields: ['Blouse length', 'Waist round', 'Full shoulder', 'Breast point', 'Chest / Bust', 'Armhole', 'Sleeve length', 'Sleeve round',
      'Front neck', 'Back neck', 'Neck width', 'Skirt length', 'Skirt waist round', 'Seat round', 'Front across width', 'Back across width', 'Strap width'],
  },
  {
    title: 'Churidar book — top',
    fields: ['Top length', 'Waist length', 'Slit length', 'Shoulder', 'Chest', 'Breast point', 'Waist round', 'Seat round', 'Flair'],
  },
  { title: 'Churidar book — bottom', fields: ['Bottom length', 'Knee length', 'Knee round', 'Ankle round', 'Chudi', 'Patiala', 'Yoke length', 'Yoke round'] },
  { title: 'Churidar book — sleeve & neck', fields: ['Sleeve length', 'Sleeve round', 'Armhole', 'Neck width', 'Front neck length', 'Back neck length'] },
]
