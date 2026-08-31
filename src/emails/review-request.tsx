import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Column,
  Section,
  Text,
} from '@react-email/components';

interface ReviewRequestProduct {
  name: string;
  image?: string;
}

export interface ReviewRequestEmailProps {
  customerName: string;
  products: ReviewRequestProduct[];
  reviewUrl: string;
  brandColor: string;
  storeName: string;
  couponEnabled: boolean;
  couponType: string;
  couponValue: number;
}

const STAR_RATINGS = [1, 2, 3, 4, 5];

function formatCouponAmount(couponType: string, couponValue: number): string {
  if (couponType === 'fixed') {
    return `${couponValue} TL`;
  }
  return `%${couponValue}`;
}

export default function ReviewRequestEmail({
  customerName,
  products,
  reviewUrl,
  brandColor,
  storeName,
  couponEnabled,
  couponType,
  couponValue,
}: ReviewRequestEmailProps) {
  const safeBrandColor = brandColor || '#111111';

  return (
    <Html lang="tr">
      <Head />
      <Preview>Alışverişiniz hakkındaki görüşünüzü bizimle paylaşın</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={{ ...header, backgroundColor: safeBrandColor }}>
            <Text style={headerText}>{storeName}</Text>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Merhaba {customerName || 'değerli müşterimiz'},</Text>
            <Text style={paragraph}>
              Sipariş ettiğiniz ürünleri kullandınız mı? Deneyiminizi bizimle ve diğer
              müşterilerimizle paylaşarak yardımcı olur musunuz?
            </Text>

            {products.length > 0 && (
              <Section style={productsWrapper}>
                {products.map((product, index) => (
                  <Row key={`${product.name}-${index}`} style={productRow}>
                    {product.image && (
                      <Column style={productImageColumn}>
                        <Img
                          src={product.image}
                          width="56"
                          height="56"
                          alt={product.name}
                          style={productImage}
                        />
                      </Column>
                    )}
                    <Column>
                      <Text style={productName}>{product.name}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            )}

            <Section style={starsWrapper}>
              <Text style={starsLabel}>Ürünü nasıl değerlendirirsiniz?</Text>
              <Row>
                {STAR_RATINGS.map((rating) => (
                  <Column key={rating} align="center" style={starColumn}>
                    <Link
                      href={`${reviewUrl}?rating=${rating}`}
                      style={{ ...starLink, color: safeBrandColor }}
                    >
                      ★
                    </Link>
                  </Column>
                ))}
              </Row>
            </Section>

            <Section style={ctaWrapper}>
              <Button
                href={reviewUrl}
                style={{ ...ctaButton, backgroundColor: safeBrandColor }}
              >
                Yorum Yaz
              </Button>
            </Section>

            {couponEnabled && (
              <Section style={couponBanner}>
                <Text style={couponText}>
                  🎁 Fotoğraflı yorum bırakın, {formatCouponAmount(couponType, couponValue)}{' '}
                  indirim kazanın!
                </Text>
              </Section>
            )}

            <Hr style={divider} />

            <Text style={footerText}>
              Bu e-postayı, {storeName} mağazasından yaptığınız alışveriş sonrasında aldınız.
              İlgili değildiyseniz görmezden gelebilirsiniz.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ReviewRequestEmail.PreviewProps = {
  customerName: 'Ayşe',
  products: [{ name: 'Örnek Ürün', image: undefined }],
  reviewUrl: 'https://example.com/review/sample-token',
  brandColor: '#111111',
  storeName: 'Örnek Mağaza',
  couponEnabled: true,
  couponType: 'percentage',
  couponValue: 10,
} satisfies ReviewRequestEmailProps;

const main: React.CSSProperties = {
  backgroundColor: '#f4f4f5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
  padding: '32px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  overflow: 'hidden',
  maxWidth: '480px',
  margin: '0 auto',
  border: '1px solid #e4e4e7',
};

const header: React.CSSProperties = {
  padding: '24px 32px',
  textAlign: 'center',
};

const headerText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '18px',
  fontWeight: 700,
  margin: 0,
};

const content: React.CSSProperties = {
  padding: '32px',
};

const greeting: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#18181b',
  margin: '0 0 12px',
};

const paragraph: React.CSSProperties = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#52525b',
  margin: '0 0 24px',
};

const productsWrapper: React.CSSProperties = {
  backgroundColor: '#fafafa',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '24px',
};

const productRow: React.CSSProperties = {
  marginBottom: '8px',
};

const productImageColumn: React.CSSProperties = {
  width: '64px',
};

const productImage: React.CSSProperties = {
  borderRadius: '6px',
  objectFit: 'cover',
};

const productName: React.CSSProperties = {
  fontSize: '14px',
  color: '#27272a',
  margin: 0,
};

const starsWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const starsLabel: React.CSSProperties = {
  fontSize: '13px',
  color: '#71717a',
  margin: '0 0 8px',
};

const starColumn: React.CSSProperties = {
  padding: '0 4px',
};

const starLink: React.CSSProperties = {
  fontSize: '28px',
  textDecoration: 'none',
  lineHeight: '1',
};

const ctaWrapper: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: '24px',
};

const ctaButton: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '12px 32px',
  borderRadius: '8px',
  display: 'inline-block',
};

const couponBanner: React.CSSProperties = {
  backgroundColor: '#fef3c7',
  borderRadius: '8px',
  padding: '14px 16px',
  marginBottom: '24px',
};

const couponText: React.CSSProperties = {
  fontSize: '13px',
  color: '#92400e',
  textAlign: 'center',
  margin: 0,
  fontWeight: 600,
};

const divider: React.CSSProperties = {
  borderColor: '#e4e4e7',
  margin: '0 0 16px',
};

const footerText: React.CSSProperties = {
  fontSize: '12px',
  color: '#a1a1aa',
  lineHeight: '18px',
  margin: 0,
};
