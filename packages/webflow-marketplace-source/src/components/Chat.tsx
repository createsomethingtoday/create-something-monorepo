import TemplateChat from '@marketplace/chat/TemplateChat';
import {useAnalyticsConsent} from './Consent';
export default function Chat(){
 const enableAnalytics=useAnalyticsConsent();
 return <>{import.meta.env.DEV&&<p role="status">Development preview: chat UI is available; live chat requests are disabled.</p>}<TemplateChat variant="inline" turnstileSiteKey={import.meta.env.DEV?'':undefined} enableAnalytics={enableAnalytics} enablePageActions={false} sessionScope="source-chat"/></>;
}
