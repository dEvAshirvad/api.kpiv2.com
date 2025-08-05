import { createRouter } from '@/configs/server.config';
import kpiTemplateRoutes from './kpi_template/kpi_template.router';
import kpiEntryRoutes from './kpi_entry/kpi_entry.router';

const router = createRouter();

router.use('/kpi-templates', kpiTemplateRoutes);
router.use('/kpi-entries', kpiEntryRoutes);

export default router;
