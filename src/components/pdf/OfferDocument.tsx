import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register Roboto font for Turkish character support (ş, ğ, ı, ö, ç, ü)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf', fontWeight: 300 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-medium-webfont.ttf', fontWeight: 500 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ]
});

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 20,
    marginBottom: 30,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  subHeaderText: {
    fontSize: 10,
    color: '#666666',
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    color: '#111827',
  },
  text: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.5,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 4,
  },
  metaBlock: {
    width: '45%',
  },
  metaTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 2,
  },
  table: {
    display: 'flex',
    flexDirection: 'column',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minHeight: 25,
    alignItems: 'center',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    fontSize: 10,
    fontWeight: 700,
    color: '#374151',
  },
  col1: { width: '50%', paddingLeft: 10 },
  col2: { width: '15%', textAlign: 'center' },
  col3: { width: '15%', textAlign: 'right' },
  col4: { width: '20%', textAlign: 'right', paddingRight: 10 },
  totalsSection: {
    alignSelf: 'flex-end',
    width: '40%',
    marginTop: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 2,
    borderTopColor: '#111827',
    marginTop: 4,
  },
  grandTotalText: {
    fontSize: 12,
    fontWeight: 700,
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 10,
  }
});

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val);
};

export interface OfferDocumentProps {
  data: {
    offerNumber: string;
    date: string;
    agencyName: string;
    agencyAddress?: string;
    coverLetter?: string;
    items: Array<{
      id: string;
      name: string;
      description?: string;
      quantity: number;
      unitPrice: number;
    }>;
    totals: {
      subtotal: number;
      discountTotal: number;
      netTotal: number;
      taxTotal: number;
      grandTotal: number;
    };
  };
}

export function OfferDocument({ data }: OfferDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerText}>KobiKolay CRM</Text>
            <Text style={styles.subHeaderText}>Akıllı B2B Teklif Çözümleri</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>TEKLİF BELGESİ</Text>
            <Text style={styles.subHeaderText}>No: {data.offerNumber}</Text>
            <Text style={styles.subHeaderText}>Tarih: {data.date}</Text>
          </View>
        </View>

        {/* Meta Grid */}
        <View style={styles.metaGrid}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>Teklif Sunan</Text>
            <Text style={styles.text}>KobiKolay Teknoloji A.Ş.</Text>
            <Text style={styles.text}>info@kobikolay.com</Text>
            <Text style={styles.text}>İstanbul, Türkiye</Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>Teklif Sunulan Acente</Text>
            <Text style={styles.text}>{data.agencyName}</Text>
            {data.agencyAddress && <Text style={styles.text}>{data.agencyAddress}</Text>}
          </View>
        </View>

        {/* Cover Letter */}
        {data.coverLetter && (
          <View style={styles.section}>
            <Text style={[styles.text, { marginBottom: 15 }]}>{data.coverLetter}</Text>
          </View>
        )}

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeader, styles.col1]}>Modül / Hizmet</Text>
            <Text style={[styles.tableHeader, styles.col2]}>Miktar</Text>
            <Text style={[styles.tableHeader, styles.col3]}>B. Fiyat</Text>
            <Text style={[styles.tableHeader, styles.col4]}>Toplam</Text>
          </View>

          {data.items.map((item) => (
            <View style={styles.tableRow} key={item.id}>
              <View style={styles.col1}>
                <Text style={{ fontSize: 10, fontWeight: 700 }}>{item.name}</Text>
                {item.description && <Text style={{ fontSize: 8, color: '#6b7280' }}>{item.description}</Text>}
              </View>
              <Text style={[styles.text, styles.col2]}>{item.quantity}</Text>
              <Text style={[styles.text, styles.col3]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.text, styles.col4]}>
                {formatCurrency(item.unitPrice * item.quantity)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.text}>Ara Toplam:</Text>
            <Text style={styles.text}>{formatCurrency(data.totals.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.text}>İskonto:</Text>
            <Text style={styles.text}>-{formatCurrency(data.totals.discountTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.text}>Net Tutar:</Text>
            <Text style={styles.text}>{formatCurrency(data.totals.netTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.text}>KDV Toplamı:</Text>
            <Text style={styles.text}>{formatCurrency(data.totals.taxTotal)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Genel Toplam:</Text>
            <Text style={styles.grandTotalText}>{formatCurrency(data.totals.grandTotal)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `Bu belge KobiKolay B2B CRM sistemi tarafından otomatik oluşturulmuştur. Elektronik imza niteliği taşımaz. | Sayfa ${pageNumber} / ${totalPages}`
        )} fixed />
      </Page>
    </Document>
  );
}
