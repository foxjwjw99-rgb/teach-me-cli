'use client';

import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/hooks/use-i18n';
import { PDF_PROVIDERS } from '@/lib/pdf/constants';
import type { PDFProviderId } from '@/lib/pdf/types';

/**
 * Get display label for feature
 */
function getFeatureLabel(feature: string, t: (key: string) => string): string {
  const labels: Record<string, string> = {
    text: t('settings.featureText'),
    images: t('settings.featureImages'),
    tables: t('settings.featureTables'),
    formulas: t('settings.featureFormulas'),
    'layout-analysis': t('settings.featureLayoutAnalysis'),
    metadata: t('settings.featureMetadata'),
  };
  return labels[feature] || feature;
}

interface PDFSettingsProps {
  selectedProviderId: PDFProviderId;
}

export function PDFSettings({ selectedProviderId }: PDFSettingsProps) {
  const { t } = useI18n();
  const pdfProvider = PDF_PROVIDERS[selectedProviderId];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
        {t('settings.pdfBuiltInNotice') !== 'settings.pdfBuiltInNotice'
          ? t('settings.pdfBuiltInNotice')
          : 'OpenMAIC uses the built-in PDF parser by default. No local PDF service or extra API configuration is required.'}
      </div>

      <div className="space-y-2">
        <Label className="text-sm">{t('settings.pdfFeatures')}</Label>
        <div className="flex flex-wrap gap-2">
          {pdfProvider.features.map((feature) => (
            <Badge key={feature} variant="secondary" className="font-normal">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {getFeatureLabel(feature, t)}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
