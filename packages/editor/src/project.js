export function createItem(heading = 'New heading') {
  return {
    id: crypto.randomUUID(),
    heading,
    beat: '',
    paragraph: '',
    notes: '',
    firstPage: '',
    checks: {
      want: false,
      pressure: false,
      change: false,
      consequence: false
    }
  };
}

export function createDefaultProject() {
  return {
    app: 'Dropline Method 3',
    schemaVersion: 1,
    title: 'Untitled Dropline Project',
    promise: '',
    updatedAt: new Date().toISOString(),
    items: [
      createItem('The opening pressure'),
      createItem('The first complication'),
      createItem('The consequence')
    ]
  };
}
