type ClassValue = string | number | boolean | null | undefined | ClassValue[]

export function cn(...inputs: ClassValue[]) {
  const classes: string[] = []

  const pushValue = (value: ClassValue) => {
    if (!value) {
      return
    }

    if (Array.isArray(value)) {
      for (const nested of value) {
        pushValue(nested)
      }
      return
    }

    classes.push(String(value))
  }

  for (const input of inputs) {
    pushValue(input)
  }

  return classes.join(" ")
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
}
