import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import type Passenger from '#models/passenger'
import type Tenant from '#models/tenant'

interface TicketData {
  tenant: Tenant
  passenger: Passenger
  tripInfo: {
    departureCity: string
    arrivalCity: string
    departureTime: string
    arrivalTime: string
    travelClass: string
    price: number
    busLicensePlate: string
  }
}

export default class TicketGenerator {
  async generate(data: TicketData): Promise<Buffer> {
    const { tenant, passenger, tripInfo } = data

    const qrBuffer = await QRCode.toBuffer(passenger.qrCode, {
      width: 120,
      margin: 1,
    })

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226, 500],
        margin: 15,
      })

      const chunks: Buffer[] = []
      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Header
      doc.fontSize(14).font('Helvetica-Bold').text(tenant.name, { align: 'center' })
      doc.moveDown(0.3)
      doc.fontSize(8).font('Helvetica').text('Ticket de transport', { align: 'center' })
      doc.moveDown(0.5)

      // Separator
      doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke()
      doc.moveDown(0.5)

      // Trip info
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(`${tripInfo.departureCity} → ${tripInfo.arrivalCity}`)
      doc.moveDown(0.3)
      doc.fontSize(8).font('Helvetica')
      doc.text(`Départ: ${tripInfo.departureTime}`)
      doc.text(`Arrivée: ${tripInfo.arrivalTime}`)
      doc.text(`Classe: ${tripInfo.travelClass.toUpperCase()}`)
      doc.text(`Bus: ${tripInfo.busLicensePlate}`)
      doc.moveDown(0.5)

      // Separator
      doc.moveTo(15, doc.y).lineTo(211, doc.y).stroke()
      doc.moveDown(0.5)

      // Passenger info
      doc.fontSize(9).font('Helvetica-Bold')
      doc.text(`Passager: ${passenger.fullName}`)
      doc.fontSize(8).font('Helvetica')
      doc.text(`Siège: ${passenger.seatNumber}`)
      doc.text(`Code: ${passenger.code}`)
      doc.moveDown(0.5)

      // Price
      doc.fontSize(10).font('Helvetica-Bold')
      doc.text(`${tripInfo.price.toLocaleString('fr-FR')} FCFA`, { align: 'center' })
      doc.moveDown(0.5)

      // QR Code
      doc.image(qrBuffer, (226 - 120) / 2, doc.y, { width: 120, height: 120 })
      doc.moveDown(8)

      // Footer
      doc.fontSize(6).font('Helvetica')
      doc.text('Présentez ce ticket à l\'embarquement', { align: 'center' })

      doc.end()
    })
  }
}
