export function releaseLabel (version) {
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('version must be semantic')
  return `solo-cli@${version}`
}
