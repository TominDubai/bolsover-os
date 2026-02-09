import JSZip from 'jszip'

interface ImageMapping {
  row: number
  imageId: string
  imageData: Blob
  fileName: string
}

/**
 * Extract images from an Excel file and map them to rows
 */
export async function extractImagesFromExcel(file: File): Promise<Map<number, Blob>> {
  const zip = await JSZip.loadAsync(file)
  
  // 1. Get the drawing relationships to map rId to image files
  const relsFile = zip.file('xl/drawings/_rels/drawing1.xml.rels')
  if (!relsFile) {
    console.log('No drawing relationships found')
    return new Map()
  }
  
  const relsXml = await relsFile.async('text')
  const rIdToImage = parseRelationships(relsXml)
  
  // 2. Get the drawing XML to map images to rows
  const drawingFile = zip.file('xl/drawings/drawing1.xml')
  if (!drawingFile) {
    console.log('No drawing found')
    return new Map()
  }
  
  const drawingXml = await drawingFile.async('text')
  const rowToRId = parseDrawingAnchors(drawingXml)
  
  // 3. Extract actual image files and map to rows
  const rowToImage = new Map<number, Blob>()
  
  for (const [row, rId] of rowToRId) {
    const imagePath = rIdToImage.get(rId)
    if (!imagePath) continue
    
    const imageFile = zip.file(`xl/${imagePath}`)
    if (!imageFile) continue
    
    // Get the raw data and create blob with correct MIME type
    const imageData = await imageFile.async('arraybuffer')
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'png'
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 
                     ext === 'gif' ? 'image/gif' : 'image/png'
    
    const imageBlob = new Blob([imageData], { type: mimeType })
    rowToImage.set(row, imageBlob)
  }
  
  console.log(`📸 Extracted ${rowToImage.size} images from Excel`)
  return rowToImage
}

/**
 * Parse relationships XML to get rId -> image path mapping
 */
function parseRelationships(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  
  // Match: <Relationship Id="rId1" ... Target="../media/image1.png"/>
  const regex = /Relationship[^>]+Id="(rId\d+)"[^>]+Target="([^"]+)"/g
  let match
  
  while ((match = regex.exec(xml)) !== null) {
    const rId = match[1]
    let target = match[2]
    
    // Remove ../ prefix if present
    if (target.startsWith('../')) {
      target = target.substring(3)
    }
    
    if (target.includes('media/image')) {
      map.set(rId, target)
    }
  }
  
  return map
}

/**
 * Parse drawing anchors XML to get row -> rId mapping
 * Only gets the first/primary image for each row
 */
function parseDrawingAnchors(xml: string): Map<number, string> {
  const map = new Map<number, string>()
  
  // Match twoCellAnchor and oneCellAnchor elements
  // Looking for: <xdr:row>69</xdr:row> ... r:embed="rId7"
  
  // Split by anchor elements
  const anchorRegex = /<xdr:(twoCellAnchor|oneCellAnchor)[^>]*>([\s\S]*?)<\/xdr:\1>/g
  let anchorMatch
  
  while ((anchorMatch = anchorRegex.exec(xml)) !== null) {
    const anchorContent = anchorMatch[2]
    
    // Get the row number from <xdr:from><xdr:row>
    const fromRowMatch = anchorContent.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/)
    if (!fromRowMatch) continue
    
    const row = parseInt(fromRowMatch[1], 10)
    
    // Get the rId from r:embed="rIdX"
    const embedMatch = anchorContent.match(/r:embed="(rId\d+)"/)
    if (!embedMatch) continue
    
    const rId = embedMatch[1]
    
    // Only store if we don't already have an image for this row
    // (some rows might have multiple images, we take the first)
    if (!map.has(row)) {
      map.set(row, rId)
    }
  }
  
  return map
}

/**
 * Upload image to Supabase Storage and return public URL
 */
export async function uploadImageToStorage(
  supabase: any,
  imageBlob: Blob,
  projectId: string,
  itemIndex: number
): Promise<string | null> {
  try {
    // Determine file extension and content type from blob
    const contentType = imageBlob.type || 'image/png'
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 
                contentType.includes('gif') ? 'gif' : 'png'
    
    const fileName = `${projectId}/${Date.now()}-${itemIndex}.${ext}`
    
    console.log(`📸 Uploading ${fileName} as ${contentType}`)
    
    const { data, error } = await supabase.storage
      .from('boq-images')
      .upload(fileName, imageBlob, {
        contentType: contentType,
        upsert: false
      })
    
    if (error) {
      console.error('Failed to upload image:', error)
      return null
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('boq-images')
      .getPublicUrl(fileName)
    
    return urlData?.publicUrl || null
  } catch (err) {
    console.error('Image upload error:', err)
    return null
  }
}
