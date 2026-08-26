import ClearIcon from './clear.jsx'
import FogIcon from './fog.jsx'
import HeavyDrizzleIcon from './heavyDrizzle.jsx'
import HeavyRainIcon from './heavyRain.jsx'
import HeavySnowIcon from './heavySnow.jsx'
import IcyDrizzleIcon from './icyDrizzle.jsx'
import IcyFogIcon from './icyFog.jsx'
import IcyRainIcon from './icyRain.jsx'
import LightDrizzleIcon from './lightDrizzle.jsx'
import LightIcyDrizzleIcon from './lightIcyDrizzle.jsx'
import LightIcyRainIcon from './lightIcyRain.jsx'
import LightRainIcon from './lightRain.jsx'
import LightSnowIcon from './lightSnow.jsx'
import ModerateRainIcon from './moderateRain.jsx'
import ModerateSnowIcon from './moredateSnow.jsx'
import MostlyClearIcon from './mostlyClear.jsx'
import OvercastIcon from './overcast.jsx'
import PartlyCloudyIcon from './partlyCloudy.jsx'
import SnowGrainIcon from './snowGrain.jsx'
import ThunderstormIcon from './thunderstorm.jsx'
import ThunderstormHailIcon from './thunderstormHail.jsx'

// Open-Meteo WMO weather interpretation codes
// https://open-meteo.com/en/docs
const iconsNight = {
	0: ClearIcon,
	1: MostlyClearIcon,
	2: PartlyCloudyIcon,
	3: OvercastIcon,
	45: FogIcon,
	48: IcyFogIcon,
	51: LightDrizzleIcon,
	53: HeavyDrizzleIcon,
	55: HeavyDrizzleIcon,
	56: LightIcyDrizzleIcon,
	57: IcyDrizzleIcon,
	61: LightRainIcon,
	63: ModerateRainIcon,
	65: HeavyRainIcon,
	66: LightIcyRainIcon,
	67: IcyRainIcon,
	71: LightSnowIcon,
	73: ModerateSnowIcon,
	75: HeavySnowIcon,
	77: SnowGrainIcon,
	80: LightRainIcon,
	81: ModerateRainIcon,
	82: HeavyRainIcon,
	85: LightSnowIcon,
	86: HeavySnowIcon,
	95: ThunderstormIcon,
	96: ThunderstormHailIcon,
	99: ThunderstormHailIcon,
}

export default iconsNight
