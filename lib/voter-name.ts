export function normalizeVoterName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function voterNameKey(name: string) {
  return normalizeVoterName(name).toLocaleLowerCase()
}
