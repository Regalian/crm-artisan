import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";

// Register default fonts (Helvetica is built-in to @react-pdf/renderer)
Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

// Colours matching the site theme
const colours = {
  blue: "#2563eb",
  blueDark: "#1e40af",
  zinc900: "#18181b",
  zinc700: "#3f3f46",
  zinc600: "#52525b",
  zinc500: "#71717a",
  zinc400: "#a1a1aa",
  zinc200: "#e4e4e7",
  zinc100: "#f4f4f5",
  zinc50: "#fafafa",
  white: "#ffffff",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colours.zinc900,
    paddingBottom: 60, // space for footer
  },
  // --- Header ---
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 20,
    borderBottom: `1pt solid ${colours.blue}`,
  },
  businessName: {
    fontSize: 20,
    fontWeight: "bold",
    color: colours.blue,
  },
  quoteNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: colours.zinc900,
    textAlign: "right",
  },
  quoteLabel: {
    fontSize: 9,
    color: colours.zinc500,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  // --- Sections ---
  section: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: colours.zinc500,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  twoColumn: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
  },
  infoBlock: {
    flex: 1,
  },
  infoLine: {
    fontSize: 10,
    color: colours.zinc700,
    marginBottom: 3,
  },
  infoLabel: {
    fontSize: 8,
    color: colours.zinc500,
    marginBottom: 2,
  },
  // --- Table ---
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottom: `1pt solid ${colours.zinc200}`,
    paddingBottom: 6,
    marginBottom: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: colours.zinc500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  colDescription: {
    flex: 3,
    paddingRight: 10,
  },
  colCenter: {
    flex: 1,
    textAlign: "center",
  },
  colRight: {
    flex: 1.5,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: `0.5pt solid ${colours.zinc200}`,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tableRowAlt: {
    backgroundColor: colours.zinc50,
  },
  rowText: {
    fontSize: 10,
    color: colours.zinc900,
  },
  rowTextCenter: {
    fontSize: 10,
    color: colours.zinc600,
    textAlign: "center",
  },
  rowTextRight: {
    fontSize: 10,
    color: colours.zinc900,
    textAlign: "right",
  },
  // --- Total ---
  totalSection: {
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTop: `2pt solid ${colours.zinc900}`,
    paddingTop: 10,
    marginTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: colours.zinc700,
    marginRight: 20,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: colours.blue,
    width: 100,
    textAlign: "right",
  },
  // --- Notes ---
  notesBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: colours.zinc50,
    borderRadius: 3,
  },
  notesText: {
    fontSize: 9,
    color: colours.zinc600,
    lineHeight: 1.5,
  },
  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `0.5pt solid ${colours.zinc200}`,
    paddingTop: 10,
    fontSize: 7,
    color: colours.zinc400,
  },
});

// Helper to format GBP without Intl (PDF renderer doesn't support it)
function formatGBP(amount: number): string {
  const fixed = amount.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `£${withCommas}.${decPart}`;
}

interface LineItemData {
  description: string;
  quantity: number;
  unit_price: number;
}

interface QuotePdfProps {
  quote: {
    quote_number: string;
    date: string;
    notes: string | null;
    line_items: LineItemData[];
    job_site: {
      title: string;
      address: string;
      client: {
        name: string;
        phone: string | null;
        email: string | null;
      };
    };
  };
  total: number;
}

export function QuotePdfDocument({ quote, total }: QuotePdfProps) {
  const dateStr = quote.date
    ? new Date(quote.date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";


  return (
    <Document
      title={`Quote ${quote.quote_number}`}
      author="Artisan Services"
    >
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.businessName}>Artisan Services</Text>
          </View>
          <View>
            <Text style={styles.quoteLabel}>Quote</Text>
            <Text style={styles.quoteNumber}>{quote.quote_number}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <View style={styles.twoColumn}>
            {/* Client Info */}
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Client</Text>
              <Text style={styles.infoLine}>{quote.job_site.client.name}</Text>
              {quote.job_site.client.phone && (
                <Text style={styles.infoLine}>
                  {quote.job_site.client.phone}
                </Text>
              )}
              {quote.job_site.client.email && (
                <Text style={styles.infoLine}>
                  {quote.job_site.client.email}
                </Text>
              )}
            </View>

            {/* Job Site & Date */}
            <View style={styles.infoBlock}>
              <Text style={styles.infoLabel}>Job Site</Text>
              <Text style={styles.infoLine}>{quote.job_site.title}</Text>
              <Text style={styles.infoLine}>{quote.job_site.address}</Text>
              <Text style={[styles.infoLabel, { marginTop: 10 }]}>Date</Text>
              <Text style={styles.infoLine}>{dateStr}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Line Items</Text>

          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colDescription]}>
              Description
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colCenter]}>Qty</Text>
            <Text style={[styles.tableHeaderCell, styles.colCenter]}>
              Unit Price
            </Text>
            <Text style={[styles.tableHeaderCell, styles.colRight]}>Total</Text>
          </View>

          {/* Table Rows */}
          {quote.line_items.map((item, idx) => {
            const lineTotal = item.quantity * item.unit_price;
            return (
              <View
                key={idx}
                style={idx % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}
                wrap
              >
                <Text style={[styles.rowText, styles.colDescription]}>
                  {item.description}
                </Text>
                <Text style={[styles.rowTextCenter, styles.colCenter]}>
                  {item.quantity}
                </Text>
                <Text style={[styles.rowTextCenter, styles.colCenter]}>
                  {formatGBP(item.unit_price)}
                </Text>
                <Text style={[styles.rowTextRight, styles.colRight]}>
                  {formatGBP(lineTotal)}
                </Text>
              </View>
            );
          })}

          {/* Total */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatGBP(total)}</Text>
          </View>

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Artisan Services</Text>
          <Text>
            Page{" "}
            <Text
              render={({ pageNumber }: { pageNumber: number }) => pageNumber}
            />{" "}
            of{" "}
            <Text
              render={({ totalPages }: { totalPages: number }) => totalPages}
            />
          </Text>
        </View>
      </Page>
    </Document>
  );
}
