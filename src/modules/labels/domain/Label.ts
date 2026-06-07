import { ok, err, type Result } from "@/shared/result";
import { ValidationError } from "@/shared/errors";

export interface LabelProps {
  readonly id: string;
  readonly projectId: string;
  readonly name: string;
  readonly color: string;
  readonly createdAt: Date;
}

const NAME_MIN = 1;
const NAME_MAX = 50;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export class Label {
  private constructor(private readonly props: LabelProps) {
    Object.freeze(this);
  }

  static create(props: LabelProps): Result<Label, ValidationError> {
    const name = props.name.trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return err(
        new ValidationError(`Label name must be ${NAME_MIN}-${NAME_MAX} chars`, {
          field: "name",
        }),
      );
    }
    if (!HEX_COLOR.test(props.color)) {
      return err(
        new ValidationError("Label color must be #RRGGBB", { field: "color" }),
      );
    }
    return ok(new Label({ ...props, name, color: props.color.toLowerCase() }));
  }

  static fromPersistence(props: LabelProps): Label {
    return new Label(props);
  }

  get id(): string {
    return this.props.id;
  }
  get projectId(): string {
    return this.props.projectId;
  }
  get name(): string {
    return this.props.name;
  }
  get color(): string {
    return this.props.color;
  }
  get createdAt(): Date {
    return new Date(this.props.createdAt);
  }

  toJSON(): LabelProps {
    return { ...this.props };
  }
}
