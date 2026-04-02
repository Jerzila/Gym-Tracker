import type { ComponentProps, ComponentType } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bolt,
  Calculator,
  Calendar,
  Ellipsis,
  Flame,
  HelpCircle,
  Home,
  Scale,
  Search,
  Settings,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Dumbbell,
  ArrowLeftRight,
} from "lucide-react";

export type IconProps = Omit<ComponentProps<"svg">, "color"> & {
  size?: number;
};

type LucideIcon = ComponentType<Record<string, unknown>>;

const DEFAULT_SIZE = 22;
const DEFAULT_STROKE_WIDTH = 1.8;

function wrapLucide(Icon: LucideIcon) {
  return function LiftlyIcon({ size, className, ...props }: IconProps) {
    return (
      <Icon
        size={size ?? DEFAULT_SIZE}
        color="currentColor"
        strokeWidth={DEFAULT_STROKE_WIDTH}
        className={className}
        {...props}
      />
    );
  };
}

export const TrophyIcon = wrapLucide(Trophy);
export const FireIcon = wrapLucide(Flame);
export const CalendarIcon = wrapLucide(Calendar);
export const HomeIcon = wrapLucide(Home);
export const UserIcon = wrapLucide(User);
export const SearchIcon = wrapLucide(Search);
export const UserPlusIcon = wrapLucide(UserPlus);
export const StrengthIcon = wrapLucide(Dumbbell);
export const ChartIcon = wrapLucide(BarChart3);
export function MaleIcon({ size, className, ...props }: IconProps) {
  const s = size ?? DEFAULT_SIZE;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 768 768"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="male-b3d575b206">
          <path d="M 220 362.785156 L 548 362.785156 L 548 661 L 220 661 Z M 220 362.785156 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="male-741335f479">
          <path d="M 268.800781 100.886719 L 499.199219 100.886719 L 499.199219 331.285156 L 268.800781 331.285156 Z M 268.800781 100.886719 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="male-67d3aa5788">
          <path
            d="M 384 100.886719 C 320.375 100.886719 268.800781 152.460938 268.800781 216.085938 C 268.800781 279.710938 320.375 331.285156 384 331.285156 C 447.625 331.285156 499.199219 279.710938 499.199219 216.085938 C 499.199219 152.460938 447.625 100.886719 384 100.886719 Z M 384 100.886719 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id="male-09105e7f27">
          <path d="M 0.800781 0.886719 L 231.199219 0.886719 L 231.199219 231.285156 L 0.800781 231.285156 Z M 0.800781 0.886719 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="male-3d9d9d7262">
          <path
            d="M 116 0.886719 C 52.375 0.886719 0.800781 52.460938 0.800781 116.085938 C 0.800781 179.710938 52.375 231.285156 116 231.285156 C 179.625 231.285156 231.199219 179.710938 231.199219 116.085938 C 231.199219 52.460938 179.625 0.886719 116 0.886719 Z M 116 0.886719 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id="male-5c5323881e">
          <rect x="0" width="232" y="0" height="232" />
        </clipPath>
      </defs>
      <g clipPath="url(#male-b3d575b206)">
        <path
          fill="currentColor"
          d="M 433.167969 631.640625 C 411.300781 669.519531 356.628906 669.519531 334.761719 631.640625 L 281.675781 539.695312 L 228.585938 447.746094 C 206.71875 409.867188 234.054688 362.523438 277.792969 362.523438 L 490.136719 362.523438 C 533.875 362.523438 561.207031 409.867188 539.339844 447.746094 L 486.253906 539.695312 Z M 433.167969 631.640625 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <g clipPath="url(#male-741335f479)">
        <g clipPath="url(#male-67d3aa5788)">
          <g transform="matrix(1, 0, 0, 1, 268, 100)">
            <g clipPath="url(#male-5c5323881e)">
              <g clipPath="url(#male-09105e7f27)">
                <g clipPath="url(#male-3d9d9d7262)">
                  <path
                    fill="#f59e0b"
                    d="M 0.800781 0.886719 L 231.199219 0.886719 L 231.199219 231.285156 L 0.800781 231.285156 Z M 0.800781 0.886719 "
                    fillOpacity="1"
                    fillRule="nonzero"
                  />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export function FemaleIcon({ size, className, ...props }: IconProps) {
  const s = size ?? DEFAULT_SIZE;
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 768 768"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id="female-5b266f4981">
          <path d="M 220 372 L 548 372 L 548 669.300781 L 220 669.300781 Z M 220 372 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="female-7e96f406f2">
          <path d="M 268.800781 100.886719 L 499.199219 100.886719 L 499.199219 331.285156 L 268.800781 331.285156 Z M 268.800781 100.886719 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="female-299b4e003c">
          <path
            d="M 384 100.886719 C 320.375 100.886719 268.800781 152.460938 268.800781 216.085938 C 268.800781 279.710938 320.375 331.285156 384 331.285156 C 447.625 331.285156 499.199219 279.710938 499.199219 216.085938 C 499.199219 152.460938 447.625 100.886719 384 100.886719 Z M 384 100.886719 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id="female-1ea70e7dc7">
          <path d="M 0.800781 0.886719 L 231.199219 0.886719 L 231.199219 231.285156 L 0.800781 231.285156 Z M 0.800781 0.886719 " clipRule="nonzero" />
        </clipPath>
        <clipPath id="female-50640852f2">
          <path
            d="M 116 0.886719 C 52.375 0.886719 0.800781 52.460938 0.800781 116.085938 C 0.800781 179.710938 52.375 231.285156 116 231.285156 C 179.625 231.285156 231.199219 179.710938 231.199219 116.085938 C 231.199219 52.460938 179.625 0.886719 116 0.886719 Z M 116 0.886719 "
            clipRule="nonzero"
          />
        </clipPath>
        <clipPath id="female-17d7e9e361">
          <rect x="0" width="232" y="0" height="232" />
        </clipPath>
      </defs>
      <g clipPath="url(#female-5b266f4981)">
        <path
          fill="currentColor"
          d="M 334.828125 400.441406 C 356.695312 362.566406 411.367188 362.566406 433.234375 400.441406 L 539.40625 584.339844 C 561.277344 622.214844 533.941406 669.5625 490.203125 669.5625 L 277.859375 669.5625 C 234.121094 669.5625 206.789062 622.214844 228.65625 584.339844 Z M 334.828125 400.441406 "
          fillOpacity="1"
          fillRule="nonzero"
        />
      </g>
      <g clipPath="url(#female-7e96f406f2)">
        <g clipPath="url(#female-299b4e003c)">
          <g transform="matrix(1, 0, 0, 1, 268, 100)">
            <g clipPath="url(#female-17d7e9e361)">
              <g clipPath="url(#female-1ea70e7dc7)">
                <g clipPath="url(#female-50640852f2)">
                  <path
                    fill="#f59e0b"
                    d="M 0.800781 0.886719 L 231.199219 0.886719 L 231.199219 231.285156 L 0.800781 231.285156 Z M 0.800781 0.886719 "
                    fillOpacity="1"
                    fillRule="nonzero"
                  />
                </g>
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
export const PreferNotToSayIcon = wrapLucide(HelpCircle);

export function GoatIcon({ size, ...props }: IconProps) {
  return (
    <svg
      width={size ?? DEFAULT_SIZE}
      height={size ?? DEFAULT_SIZE}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={DEFAULT_STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M7 16c0-3.2 2.5-5.5 5.5-5.5S18 12.8 18 16" />
      <path d="M9.5 10c-.8-1.6-2-2.5-3.5-3" />
      <path d="M14.5 10c.8-1.6 2-2.5 3.5-3" />
      <path d="M10 16v3.5" />
      <path d="M15 16v3.5" />
      <path d="M11.5 13.2h2" />
    </svg>
  );
}

export const StarIcon = wrapLucide(Star);
export const BoltIcon = wrapLucide(Bolt);
export const SettingsIcon = wrapLucide(Settings);
export const EllipsisIcon = wrapLucide(Ellipsis);
export const SwapHorizontalIcon = wrapLucide(ArrowLeftRight);
export const TrendingUpIcon = wrapLucide(TrendingUp);
export const TrendingDownIcon = wrapLucide(TrendingDown);
export const ScaleIcon = wrapLucide(Scale);
export const AlertTriangleIcon = wrapLucide(AlertTriangle);
export const CalculatorIcon = wrapLucide(Calculator);
